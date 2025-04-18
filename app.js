document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let currentSite = null;
    let capacite = 0;
    let tauxAccroissement = 0.02;
    let populationInitiale = 0;
    let anneeReference = 0;
    let horizonProjet = 2030;
    let populationProjetee = 0;
    let besoin = 0;
    let facteur = 1.5;
    let resultatsAHP = [];
    
    // Variables pour les graphiques
    let scoresChart = null;
    let factorsChart = null;
    
    // Éléments DOM fréquemment utilisés
    const populationInput = document.getElementById('population');
    const tauxAccroissementInput = document.getElementById('tauxAccroissement');
    const horizonInput = document.getElementById('horizon');
    const populationHorizonInput = document.getElementById('populationHorizon');
    const facteurInput = document.getElementById('facteur');
    const besoinInput = document.getElementById('besoin');
    const capaciteCalculInput = document.getElementById('capaciteCalcul');
    const capaciteManuelleInput = document.getElementById('capaciteManuelle');
    const villeInput = document.getElementById('site');
    const villeConcerneeInput = document.getElementById('villeConcernee');
    const regionFilter = document.getElementById('regionFilter');
    
    // Navigation entre les onglets
    const tabLinks = document.querySelectorAll('nav a');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Désactiver tous les liens et masquer tous les contenus
            tabLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Activer le lien et afficher le contenu correspondant
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Gestion de la préférence de valeur de capacité
    const capaciteRadios = document.querySelectorAll('input[name="capacityValue"]');
    const capaciteManuelleDiv = document.querySelector('.capacite-manuelle');
    
    capaciteRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'yes') {
                capaciteManuelleDiv.style.display = 'block';
                capaciteManuelleInput.focus();
            } else {
                capaciteManuelleDiv.style.display = 'none';
            }
        });
    });
    
    // Gestion des checkbox pour modifier les valeurs
    document.getElementById('changePopulation').addEventListener('change', function() {
        populationInput.readOnly = !this.checked;
        if (this.checked) {
            populationInput.focus();
        }
    });
    
    document.getElementById('changeTaux').addEventListener('change', function() {
        tauxAccroissementInput.readOnly = !this.checked;
        if (this.checked) {
            tauxAccroissementInput.focus();
        }
    });
    
    document.getElementById('changeHorizon').addEventListener('change', function() {
        horizonInput.readOnly = !this.checked;
        if (this.checked) {
            horizonInput.focus();
        }
    });
    
    document.getElementById('changeFacteur').addEventListener('change', function() {
        facteurInput.readOnly = !this.checked;
        if (this.checked) {
            facteurInput.focus();
        }
    });
    
    // Gestion de la préférence de type de prise
    const typePreferenceRadios = document.querySelectorAll('input[name="preferenceType"]');
    const typePreferenceSelect = document.getElementById('typePreference');
    
    typePreferenceRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            typePreferenceSelect.disabled = this.value === 'no';
            if (this.value === 'yes') {
                typePreferenceSelect.focus();
            }
        });
    });
    
    // Fonction pour mettre à jour les calculs
    function updateCalculations() {
        if (!currentSite) return;
        
        populationInitiale = parseFloat(populationInput.value) || currentSite.population;
        tauxAccroissement = parseFloat(tauxAccroissementInput.value) || 0.02;
        horizonProjet = parseInt(horizonInput.value) || 2030;
        anneeReference = currentSite.anneeReference || 2014;
        facteur = parseFloat(facteurInput.value) || 1.5;
        
        // Calcul de la population projetée
        populationProjetee = calculerPopulationProjetee(populationInitiale, tauxAccroissement, anneeReference, horizonProjet);
        populationHorizonInput.value = Math.round(populationProjetee);
        
        // Calcul du besoin en eau (150L/habitant/jour)
        besoin = (populationProjetee * 150) / 1000; // m3/jour
        besoinInput.value = Math.round(besoin) + " m3/j";
        
        // Calcul de la capacité
        capacite = besoin * facteur;
        capaciteCalculInput.value = Math.round(capacite) + " m3/j";
        
        // Mise à jour des informations dans les autres onglets
        updateSiteInfo();
        
        // Exécution de l'algorithme AHP
        executeAHP();
    }
    
    // Fonction pour mettre à jour les informations du site dans les autres onglets
    function updateSiteInfo() {
        if (!currentSite) return;
        
        document.getElementById('nombreMailles').value = currentSite.nombreMailles || 1;
        document.getElementById('distanceVilleLittoral').value = currentSite.distanceVilleLittoral + " m";
        document.getElementById('distanceVilleMaille').value = currentSite.distanceVilleMaille + " m";
        document.getElementById('distanceMailleLittoral').value = currentSite.distanceMailleLittoral + " m";
        document.getElementById('topoBathymetrie').value = currentSite.topoBathymetrie + " m";
        document.getElementById('distanceRoute').value = currentSite.distanceRoute + " m";
        
        // Ajouter des informations supplémentaires si disponibles
        if (document.getElementById('gmNom')) {
            document.getElementById('gmNom').value = currentSite.GM_NOM || "Non spécifié";
        }
        
        if (document.getElementById('typeTopoBathy')) {
            // Interprétation de la valeur de topoBathymetrie
            let topoBathyType = "Inconnu";
            const topoBathyValue = currentSite.topoBathymetrie;
            
            if (topoBathyValue < -20) {
                topoBathyType = "Profond";
            } else if (topoBathyValue < -5) {
                topoBathyType = "Modéré";
            } else if (topoBathyValue < 0) {
                topoBathyType = "Peu profond";
            } else {
                topoBathyType = "Émergé";
            }
            
            document.getElementById('typeTopoBathy').value = topoBathyType;
        }
        
        villeConcerneeInput.value = currentSite.nom;
    }
    
    // Fonction pour exécuter l'algorithme AHP et afficher les résultats
    function executeAHP() {
        if (!currentSite) return;
        
        const categorieCapacite = determinerCategorieCapacite(capacite);
        
        const siteConditions = {
            'Litt_SAB': currentSite.littoral,
            'Capacit': categorieCapacite,
            'IS_Nappe': currentSite.intrustionSaline,
            'nap_saline': currentSite.nappeSaline
        };
        
        resultatsAHP = evaluerAlternativesAHP(siteConditions);
        
        // Mise à jour du tableau des résultats
        updateResultsTable();
        
        // Mise à jour des boutons de types de prise
        updatePriseButtons();
        
        // Mise à jour des options dans le dropdown
        updatePriseOptions();
    }
    
    // Fonction pour mettre à jour le tableau des résultats
    function updateResultsTable() {
        const tableBody = document.querySelector('#tableauResultats tbody');
        tableBody.innerHTML = '';
        
        resultatsAHP.forEach(result => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${result.rang}</td>
                <td>${result.nom}</td>
                <td>${result.score}</td>
                <td>${result.description.substring(0, 100)}...</td>
            `;
            row.addEventListener('click', () => showPriseDetails(result.code));
            tableBody.appendChild(row);
        });
        
        // Mise à jour de la section Solution avec la meilleure option
        if (resultatsAHP.length > 0) {
            const bestOption = resultatsAHP[0];
            const solutionDiv = document.getElementById('solutionRecommandee');
            solutionDiv.innerHTML = `
                <h3>Solution recommandée : ${bestOption.nom}</h3>
                <p><strong>Score AHP :</strong> ${bestOption.score}</p>
                <p>${bestOption.description}</p>
                <div class="advantages-disadvantages">
                    <div>
                        <h4>Avantages</h4>
                        <ul>
                            ${ahpData.descriptions[bestOption.code].advantages.map(adv => `<li>${adv}</li>`).join('')}
                        </ul>
                    </div>
                    <div>
                        <h4>Inconvénients</h4>
                        <ul>
                            ${ahpData.descriptions[bestOption.code].disadvantages.map(dis => `<li>${dis}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                <h4>Impact environnemental</h4>
                <p>${ahpData.descriptions[bestOption.code].environmental}</p>
            `;
        }
        
        // Mettre à jour les graphiques
        updateCharts();
    }
    
    // Fonction pour mettre à jour les graphiques
    function updateCharts() {
        if (!currentSite || resultatsAHP.length === 0) return;
        
        // Données pour le graphique des scores
        const labels = resultatsAHP.slice(0, 5).map(item => item.code);
        const scores = resultatsAHP.slice(0, 5).map(item => parseFloat(item.score));
        
        // Si le graphique existe déjà, le détruire
        if (scoresChart) {
            scoresChart.destroy();
        }
        
        // Créer le graphique des scores
        const scoresCtx = document.getElementById('scoresChart').getContext('2d');
        scoresChart = new Chart(scoresCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Score AHP (plus bas = meilleur)',
                    data: scores,
                    backgroundColor: [
                        'rgba(0, 96, 100, 0.8)',
                        'rgba(0, 131, 143, 0.7)',
                        'rgba(0, 151, 167, 0.6)',
                        'rgba(0, 172, 193, 0.5)',
                        'rgba(0, 188, 212, 0.4)'
                    ],
                    borderColor: [
                        'rgba(0, 96, 100, 1)',
                        'rgba(0, 131, 143, 1)',
                        'rgba(0, 151, 167, 1)',
                        'rgba(0, 172, 193, 1)',
                        'rgba(0, 188, 212, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Données pour le graphique des facteurs
        if (factorsChart) {
            factorsChart.destroy();
        }
        
        // Interpréter les conditions du site pour le graphique des facteurs
        const siteConditions = {
            'Type de littoral': currentSite.littoral,
            'Capacité': determinerCategorieCapacite(capacite),
            'Intrusion saline': currentSite.intrustionSaline,
            'Nappe saline': currentSite.nappeSaline
        };
        
        const factorLabels = Object.keys(siteConditions);
        const factorValues = Object.values(siteConditions);
        
        // Créer le graphique des facteurs
        const factorsCtx = document.getElementById('factorsChart').getContext('2d');
        factorsChart = new Chart(factorsCtx, {
            type: 'polarArea',
            data: {
                labels: factorLabels,
                datasets: [{
                    label: 'Conditions du site',
                    data: [1, 1, 1, 1], // Valeurs uniformes pour l'affichage
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${factorValues[context.dataIndex]}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Fonction pour mettre à jour les boutons de types de prise
    function updatePriseButtons() {
        const priseButtons = document.querySelectorAll('.prise-button');
        const enabledPrises = resultatsAHP.slice(0, 5).map(result => result.code); // Top 5
        
        priseButtons.forEach(button => {
            const priseCode = button.id;
            button.classList.remove('active');
            button.classList.add('disabled');
            
            // Supprimer les événements existants pour éviter les doublons
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            if (enabledPrises.includes(priseCode)) {
                newButton.classList.remove('disabled');
                newButton.classList.add('active');
                
                // Ajouter un événement pour afficher les détails
                newButton.addEventListener('click', function() {
                    showPriseDetails(priseCode);
                });
            }
        });
    }
    
    // Fonction pour mettre à jour les options dans le dropdown
    function updatePriseOptions() {
        const select = document.getElementById('typePreference');
        select.innerHTML = '<option value="">Sélectionnez un type</option>';
        
        resultatsAHP.forEach(result => {
            const option = document.createElement('option');
            option.value = result.code;
            option.textContent = `${result.code}: ${result.nom}`;
            select.appendChild(option);
        });
    }
    
    // Fonction pour afficher les détails d'une prise d'eau
    function showPriseDetails(priseCode) {
        const modal = document.getElementById('priseModal');
        const modalTitle = document.getElementById('priseTitle');
        const modalDetails = document.getElementById('priseDetails');
        const modalEnvironmental = document.getElementById('priseEnvironmental');
        
        const priseData = ahpData.descriptions[priseCode];
        
        modalTitle.textContent = priseData.title;
        
        modalDetails.innerHTML = `
            <p>${priseData.description}</p>
            <div class="advantages-disadvantages">
                <div>
                    <h3>Avantages</h3>
                    <ul>
                        ${priseData.advantages.map(adv => `<li>${adv}</li>`).join('')}
                    </ul>
                </div>
                <div>
                    <h3>Inconvénients</h3>
                    <ul>
                        ${priseData.disadvantages.map(dis => `<li>${dis}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
        
        modalEnvironmental.innerHTML = `
            <h3>Impact environnemental</h3>
            <p>${priseData.environmental}</p>
        `;
        
        modal.style.display = 'block';
    }
    
    // Fermeture de la fenêtre modale de détails
    document.querySelector('.close').addEventListener('click', function() {
        document.getElementById('priseModal').style.display = 'none';
    });
    
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('priseModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Événements pour les champs d'entrée
    populationInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            updateCalculations();
        }
    });
    
    tauxAccroissementInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            updateCalculations();
        }
    });
    
    horizonInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            updateCalculations();
        }
    });
    
    facteurInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            updateCalculations();
        }
    });
    
    capaciteManuelleInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            capacite = parseFloat(this.value);
            capaciteCalculInput.value = Math.round(capacite) + " m3/j";
            executeAHP();
        }
    });
    
    // Événement pour le changement de région
    document.getElementById('changerRegion').addEventListener('click', function() {
        selectSite();
    });
    
    document.getElementById('regionDifferente').addEventListener('click', function() {
        selectSite();
    });
    
    document.getElementById('regionDifferente2').addEventListener('click', function() {
        selectSite();
    });
    
    // Événement pour le bouton Feuilles Excel
    document.getElementById('feuillesExcel').addEventListener('click', function() {
        alert("Cette fonctionnalité sera disponible dans une version ultérieure. Les données actuelles sont stockées dans l'application web.");
    });
    
    document.getElementById('feuillesExcel2').addEventListener('click', function() {
        alert("Cette fonctionnalité sera disponible dans une version ultérieure. Les données actuelles sont stockées dans l'application web.");
    });
    
    document.getElementById('feuillesExcel3').addEventListener('click', function() {
        alert("Cette fonctionnalité sera disponible dans une version ultérieure. Les données actuelles sont stockées dans l'application web.");
    });
    
    // Événement pour le bouton Générer Rapport
    document.getElementById('genererRapport').addEventListener('click', function() {
        generateReport();
    });
    
    // Nouvelle fonction pour sélectionner un site avec des listes déroulantes
    function selectSite() {
        // Créer une fenêtre modale pour la sélection de région et de site
        const modalHTML = `
        <div id="siteSelectionModal" style="
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
        ">
            <div style="
                background-color: white;
                padding: 20px;
                border-radius: 5px;
                width: 80%;
                max-width: 500px;
            ">
                <h3 style="margin-top: 0;">Sélection de site</h3>
                
                <div style="margin-bottom: 15px;">
                    <label for="regionSelect" style="display: block; margin-bottom: 5px;">Région :</label>
                    <select id="regionSelect" style="width: 100%; padding: 8px; margin-bottom: 15px;">
                        <option value="">Toutes les régions</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label for="siteSelect" style="display: block; margin-bottom: 5px;">Site :</label>
                    <select id="siteSelect" style="width: 100%; padding: 8px;">
                        <option value="">Sélectionnez d'abord une région</option>
                    </select>
                </div>
                
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                    <button id="cancelSiteSelection" style="
                        padding: 8px 15px;
                        background-color: #f44336;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Annuler</button>
                    <button id="confirmSiteSelection" style="
                        padding: 8px 15px;
                        background-color: #4CAF50;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    " disabled>Sélectionner</button>
                </div>
            </div>
        </div>
        `;
        
        // Ajouter le modal au document
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
        
        // Récupérer les éléments du modal
        const modal = document.getElementById('siteSelectionModal');
        const regionSelect = document.getElementById('regionSelect');
        const siteSelect = document.getElementById('siteSelect');
        const cancelButton = document.getElementById('cancelSiteSelection');
        const confirmButton = document.getElementById('confirmSiteSelection');
        
        // Récupérer toutes les régions uniques
        const regions = [];
        simulatedDatabase.sites.forEach(site => {
            if (site.GM_NOM && !regions.includes(site.GM_NOM)) {
                regions.push(site.GM_NOM);
            }
        });
        
        // Trier les régions alphabétiquement
        regions.sort();
        
        // Ajouter les options de régions
        regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region;
            option.textContent = region;
            regionSelect.appendChild(option);
        });
        
        // Fonction pour mettre à jour la liste des sites en fonction de la région sélectionnée
function updateSitesList() {
    siteSelect.innerHTML = '<option value="">Sélectionnez un site</option>';
    confirmButton.disabled = true;
    
    const selectedRegion = regionSelect.value;
    let filteredSites = [];
    
    if (selectedRegion) {
        filteredSites = simulatedDatabase.sites.filter(site => site.GM_NOM === selectedRegion);
    } else {
        filteredSites = simulatedDatabase.sites;
    }
    
    // Créer un tableau pour stocker les noms de villes uniques
    const uniqueVilles = [];
    // Créer un objet pour stocker le premier site correspondant à chaque nom de ville
    const uniqueSites = {};
    
    // Parcourir les sites filtrés pour trouver les noms uniques
    filteredSites.forEach(site => {
        if (!uniqueVilles.includes(site.nom)) {
            uniqueVilles.push(site.nom);
            uniqueSites[site.nom] = site;
        }
    });
    
    // Trier les noms de villes par ordre alphabétique
    uniqueVilles.sort();
    
    // Ajouter les options de sites uniques
    uniqueVilles.forEach(villeName => {
        const site = uniqueSites[villeName];
        const option = document.createElement('option');
        option.value = site.id;
        option.textContent = site.nom;
        siteSelect.appendChild(option);
    });
}        
        // Mettre à jour la liste des sites au changement de région
        regionSelect.addEventListener('change', updateSitesList);
        
        // Activer le bouton de confirmation lorsqu'un site est sélectionné
        siteSelect.addEventListener('change', function() {
            confirmButton.disabled = !siteSelect.value;
        });
        
        // Gérer l'annulation
        cancelButton.addEventListener('click', function() {
            document.body.removeChild(modalContainer);
        });
        
        // Gérer la confirmation
        confirmButton.addEventListener('click', function() {
            const siteId = parseInt(siteSelect.value);
            if (isNaN(siteId)) return;
            
            const selectedSite = simulatedDatabase.sites.find(site => site.id === siteId);
            if (selectedSite) {
                currentSite = selectedSite;
                
                // Mettre à jour les champs
                villeInput.value = currentSite.nom;
                populationInput.value = currentSite.population;
                
                // Mettre à jour les calculs
                updateCalculations();
                
                // Fermer le modal
                document.body.removeChild(modalContainer);
            }
        });
        
        // Initialiser la liste des sites
        updateSitesList();
    }
    
    // Recherche de sites
    const searchModal = document.getElementById('searchModal');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const closeSearchModal = document.getElementById('closeSearchModal');
    const cancelSearch = document.getElementById('cancelSearch');
    const rechercherSite = document.getElementById('rechercherSite');
    
    rechercherSite.addEventListener('click', function() {
        searchModal.style.display = 'block';
        searchInput.value = '';
        searchResults.innerHTML = '';
        searchInput.focus();
    });
    
    closeSearchModal.addEventListener('click', function() {
        searchModal.style.display = 'none';
    });
    
    cancelSearch.addEventListener('click', function() {
        searchModal.style.display = 'none';
    });
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        searchResults.innerHTML = '';
        
        if (searchTerm.length < 2) return;
        
        const sites = simulatedDatabase.sites;
        const matchingSites = sites.filter(site => 
            site.id.toString().includes(searchTerm) || 
            site.nom.toLowerCase().includes(searchTerm) ||
            (site.GM_NOM && site.GM_NOM.toLowerCase().includes(searchTerm))
        );
        
        if (matchingSites.length === 0) {
            searchResults.innerHTML = '<p>Aucun site trouvé</p>';
        } else {
            matchingSites.forEach(site => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';
                resultItem.textContent = `${site.id} - ${site.nom} ${site.GM_NOM ? `(${site.GM_NOM})` : ''}`;
                resultItem.addEventListener('click', function() {
                    currentSite = site;
                    villeInput.value = site.nom;
                    populationInput.value = site.population;
                    updateCalculations();
                    searchModal.style.display = 'none';
                });
                searchResults.appendChild(resultItem);
            });
        }
    });
    
    window.addEventListener('click', function(event) {
        if (event.target === searchModal) {
            searchModal.style.display = 'none';
        }
    });
    
    // Fonction pour générer un rapport
    function generateReport() {
        if (!currentSite) {
            alert("Veuillez d'abord sélectionner un site.");
            return;
        }
        
        const reportContent = `
            <html>
            <head>
                <title>Rapport - ${currentSite.nom}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1, h2 { color: #006064; }
                    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #006064; color: white; }
                    .section { margin: 20px 0; }
                </style>
            </head>
            <body>
                <h1>Rapport d'analyse pour la station de dessalement de ${currentSite.nom}</h1>
                <div class="section">
                    <h2>Informations générales</h2>
                    <table>
                        <tr><td><strong>Région :</strong></td><td>${currentSite.nom}</td></tr>
                        <tr><td><strong>Identifiant de région :</strong></td><td>${currentSite.GM_NOM || 'Non spécifié'}</td></tr>
                        <tr><td><strong>Population actuelle :</strong></td><td>${currentSite.population} habitants</td></tr>
                        <tr><td><strong>Année de référence :</strong></td><td>${currentSite.anneeReference}</td></tr>
                        <tr><td><strong>Taux d'accroissement :</strong></td><td>${tauxAccroissement * 100}%</td></tr>
                        <tr><td><strong>Horizon du projet :</strong></td><td>${horizonProjet}</td></tr>
                        <tr><td><strong>Population projetée :</strong></td><td>${Math.round(populationProjetee)} habitants</td></tr>
                    </table>
                </div>
                
                <div class="section">
                    <h2>Caractéristiques du site</h2>
                    <table>
                        <tr><td><strong>Distance Ville-Littoral :</strong></td><td>${currentSite.distanceVilleLittoral} m</td></tr>
                        <tr><td><strong>Distance Ville-Maille :</strong></td><td>${currentSite.distanceVilleMaille} m</td></tr>
                        <tr><td><strong>Distance Maille-Littoral :</strong></td><td>${currentSite.distanceMailleLittoral} m</td></tr>
                        <tr><td><strong>Topo-Bathymétrie :</strong></td><td>${currentSite.topoBathymetrie} m</td></tr>
                        <tr><td><strong>Distance route :</strong></td><td>${currentSite.distanceRoute} m</td></tr>
                        <tr><td><strong>Type de littoral :</strong></td><td>${currentSite.littoral}</td></tr>
                        <tr><td><strong>Intrusion saline :</strong></td><td>${currentSite.intrustionSaline}</td></tr>
                        <tr><td><strong>Nappe saline :</strong></td><td>${currentSite.nappeSaline}</td></tr>
                    </table>
                </div>
                
                <div class="section">
                    <h2>Besoins en eau et capacité</h2>
                    <table>
                        <tr><td><strong>Besoin en eau :</strong></td><td>${Math.round(besoin)} m³/j</td></tr>
                        <tr><td><strong>Facteur de traitement :</strong></td><td>${facteur}</td></tr>
                        <tr><td><strong>Capacité requise :</strong></td><td>${Math.round(capacite)} m³/j</td></tr>
                        <tr><td><strong>Catégorie de capacité :</strong></td><td>${determinerCategorieCapacite(capacite)}</td></tr>
                    </table>
                </div>
                
                <div class="section">
                    <h2>Résultats de l'analyse AHP</h2>
                    <table>
                        <tr>
                            <th>Rang</th>
                            <th>Type de prise d'eau</th>
                            <th>Score</th>
                        </tr>
                        ${resultatsAHP.map(result => `
                            <tr>
                                <td>${result.rang}</td>
                                <td>${result.nom}</td>
                                <td>${result.score}</td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
                
                <div class="section">
                    <h2>Solution recommandée</h2>
                    <h3>${resultatsAHP[0].nom}</h3>
                    <p>${resultatsAHP[0].description}</p>
                    
                    <h4>Avantages</h4>
                    <ul>
                        ${ahpData.descriptions[resultatsAHP[0].code].advantages.map(adv => `<li>${adv}</li>`).join('')}
                    </ul>
                    
                    <h4>Inconvénients</h4>
                    <ul>
                        ${ahpData.descriptions[resultatsAHP[0].code].disadvantages.map(dis => `<li>${dis}</li>`).join('')}
                    </ul>
                    
                    <h4>Impact environnemental</h4>
                    <p>${ahpData.descriptions[resultatsAHP[0].code].environmental}</p>
                </div>
                
                <div class="section">
                    <p><strong>Date du rapport :</strong> ${new Date().toLocaleDateString()}</p>
                </div>
            </body>
            </html>
        `;
        
        // Création d'une nouvelle fenêtre pour le rapport
        const reportWindow = window.open('', '_blank');
        reportWindow.document.write(reportContent);
        reportWindow.document.close();
    }
    
    // Export Excel
    document.getElementById('exportExcel').addEventListener('click', function() {
        if (!currentSite || resultatsAHP.length === 0) {
            alert("Veuillez d'abord effectuer une analyse complète.");
            return;
        }
        
        // Créer un nouveau classeur
        const wb = XLSX.utils.book_new();
        
        // Créer une feuille avec les informations du site
        const wsInfos = XLSX.utils.aoa_to_sheet([
            ['Informations sur le site'],
            [''],
            ['Nom du site', currentSite.nom],
            ['Population actuelle', currentSite.population],
            ['Année de référence', currentSite.anneeReference],
            ['Taux d\'accroissement', tauxAccroissement],
            ['Horizon du projet', horizonProjet],
            ['Population projetée', Math.round(populationProjetee)],
            [''],
            ['Caractéristiques du site'],
            ['Distance Ville-Littoral', currentSite.distanceVilleLittoral + ' m'],
            ['Distance Ville-Maille', currentSite.distanceVilleMaille + ' m'],
            ['Distance Maille-Littoral', currentSite.distanceMailleLittoral + ' m'],
            ['Topo-Bathymétrie', currentSite.topoBathymetrie + ' m'],
            ['Distance route', currentSite.distanceRoute + ' m'],
            ['Type de littoral', currentSite.littoral],
            ['Intrusion saline', currentSite.intrustionSaline],
            ['Nappe saline', currentSite.nappeSaline],
            [''],
            ['Capacité calculée'],
            ['Besoin en eau', Math.round(besoin) + ' m³/j'],
            ['Facteur de traitement', facteur],
            ['Capacité requise', Math.round(capacite) + ' m³/j'],
            ['Catégorie de capacité', determinerCategorieCapacite(capacite)]
        ]);
        
        // Créer une feuille avec les résultats AHP
        const wsResults = XLSX.utils.aoa_to_sheet([
            ['Résultats de l\'analyse AHP'],
            [''],
            ['Rang', 'Code', 'Type de prise d\'eau', 'Score']
        ]);
        
        // Ajouter les résultats
        resultatsAHP.forEach((result, index) => {
            XLSX.utils.sheet_add_aoa(wsResults, [
                [result.rang, result.code, result.nom, result.score]
            ], { origin: -1 });
        });
        
        // Ajouter les feuilles au classeur
        XLSX.utils.book_append_sheet(wb, wsInfos, "Informations");
        XLSX.utils.book_append_sheet(wb, wsResults, "Résultats AHP");
        
        // Générer le nom du fichier
        const fileName = `SAD_Dessalement_${currentSite.nom}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        
        // Écrire le fichier et le télécharger
        XLSX.writeFile(wb, fileName);
    });
    
    // Filtrage par région
    function populateRegionFilter() {
        // Vider le sélecteur
        regionFilter.innerHTML = '<option value="">Toutes les régions</option>';
        
        // Récupérer toutes les régions uniques
        const regions = [];
        simulatedDatabase.sites.forEach(site => {
            if (site.GM_NOM && !regions.includes(site.GM_NOM)) {
                regions.push(site.GM_NOM);
            }
        });
        
        // Trier les régions alphabétiquement
        regions.sort();
        
        // Ajouter les options
        regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region;
            option.textContent = region;
            regionFilter.appendChild(option);
        });
    }
    
    // Appeler cette fonction au démarrage
    populateRegionFilter();
    
    // Ajouter un écouteur d'événements au changement de région
    regionFilter.addEventListener('change', function() {
        const selectedRegion = this.value;
        
        // Si une région est sélectionnée, proposer de filtrer la liste des sites
        if (selectedRegion) {
            const filteredSites = simulatedDatabase.sites.filter(site => site.GM_NOM === selectedRegion);
            
            // Afficher un message avec le nombre de sites disponibles dans cette région
            const confirmMessage = `${filteredSites.length} sites trouvés dans la région ${selectedRegion}.\nVoulez-vous parcourir ces sites?`;
            
            if (confirm(confirmMessage)) {
                // Fonction pour afficher les sites filtrés
                showFilteredSites(filteredSites);
            }
        }
    });
    
    // Fonction pour afficher les sites filtrés
    function showFilteredSites(filteredSites) {
        if (filteredSites.length === 0) {
            alert("Aucun site trouvé dans cette région.");
            return;
        }
        
        // Créer une liste des sites pour l'utilisateur en utilisant le même modal de sélection
        const modalHTML = `
        <div id="siteSelectionModal" style="
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
        ">
            <div style="
                background-color: white;
                padding: 20px;
                border-radius: 5px;
                width: 80%;
                max-width: 500px;
            ">
                <h3 style="margin-top: 0;">Sites dans la région ${filteredSites[0].GM_NOM}</h3>
                
                <div style="margin-bottom: 15px;">
                    <label for="filteredSiteSelect" style="display: block; margin-bottom: 5px;">Sélectionnez un site :</label>
                    <select id="filteredSiteSelect" style="width: 100%; padding: 8px;">
                        <option value="">Choisir un site</option>
                    </select>
                </div>
                
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                    <button id="cancelFilteredSiteSelection" style="
                        padding: 8px 15px;
                        background-color: #f44336;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Annuler</button>
                    <button id="confirmFilteredSiteSelection" style="
                        padding: 8px 15px;
                        background-color: #4CAF50;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    " disabled>Sélectionner</button>
                </div>
            </div>
        </div>
        `;
        
        // Ajouter le modal au document
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
        
        // Récupérer les éléments du modal
        const siteSelect = document.getElementById('filteredSiteSelect');
        const cancelButton = document.getElementById('cancelFilteredSiteSelection');
        const confirmButton = document.getElementById('confirmFilteredSiteSelection');
        
        // Trier les sites par nom
        filteredSites.sort((a, b) => a.nom.localeCompare(b.nom));
        
// Ajouter ce code pour garantir l'unicité des noms de villes :
// Créer un tableau pour stocker les noms de villes uniques
const uniqueVilles = [];
// Créer un objet pour stocker le premier site correspondant à chaque nom de ville
const uniqueSites = {};

// Parcourir les sites filtrés pour trouver les noms uniques
filteredSites.forEach(site => {
    if (!uniqueVilles.includes(site.nom)) {
        uniqueVilles.push(site.nom);
        uniqueSites[site.nom] = site;
    }
});

// Trier les noms de villes par ordre alphabétique
uniqueVilles.sort();

// Remplacer le code d'ajout des options par :
// Ajouter les options de sites uniques
uniqueVilles.forEach(villeName => {
    const site = uniqueSites[villeName];
    const option = document.createElement('option');
    option.value = site.id;
    option.textContent = site.nom;
    siteSelect.appendChild(option);
});        
        // Activer le bouton de confirmation lorsqu'un site est sélectionné
        siteSelect.addEventListener('change', function() {
            confirmButton.disabled = !siteSelect.value;
        });
        
        // Gérer l'annulation
        cancelButton.addEventListener('click', function() {
            document.body.removeChild(modalContainer);
        });
        
        // Gérer la confirmation
        confirmButton.addEventListener('click', function() {
            const siteId = parseInt(siteSelect.value);
            if (isNaN(siteId)) return;
            
            const selectedSite = filteredSites.find(site => site.id === siteId);
            if (selectedSite) {
                currentSite = selectedSite;
                
                // Mettre à jour les champs
                villeInput.value = currentSite.nom;
                populationInput.value = currentSite.population;
                
                // Mettre à jour les calculs
                updateCalculations();
                
                // Fermer le modal
                document.body.removeChild(modalContainer);
            }
        });
    }
    
    // Initialisation : demander à l'utilisateur de sélectionner un site au démarrage
    selectSite();
});