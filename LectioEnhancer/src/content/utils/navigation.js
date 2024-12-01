window.LectioEnhancer = window.LectioEnhancer || {};

window.LectioEnhancer.enhanceNavigation = function() {
    const navContainer = document.getElementById('s_m_HeaderContent_subnavigator_generic_tr');
    if (!navContainer) return;

    // Tilføj ekstra styling til container
    navContainer.style.display = 'flex';
    navContainer.style.flexWrap = 'wrap';
    navContainer.style.gap = '5px';
    navContainer.style.padding = '5px';

    // Tilføj pirat-knap
    const piratButton = document.createElement('div');
    piratButton.className = 'buttonlink';
    const schoolId = window.location.href.match(/lectio\/(\d+)\//)?.[1];
    
    const piratLink = document.createElement('a');
    piratLink.href = `/lectio/${schoolId}/pirat.aspx`;
    piratLink.setAttribute('data-role', 'button');
    piratLink.innerHTML = '🏴‍☠️ Pirat';
    
    // Samme styling som andre links
    piratLink.style.display = 'flex';
    piratLink.style.alignItems = 'center';
    piratLink.style.gap = '5px';
    piratLink.style.padding = '5px 10px';
    piratLink.style.borderRadius = '4px';
    piratLink.style.textDecoration = 'none';
    
    // Hover effekt
    piratLink.addEventListener('mouseenter', () => {
        piratLink.style.backgroundColor = '#f0f0f0';
    });
    
    piratLink.addEventListener('mouseleave', () => {
        piratLink.style.backgroundColor = '';
    });

    piratButton.appendChild(piratLink);
    navContainer.appendChild(piratButton);

    // Find alle navigation links
    const navLinks = navContainer.querySelectorAll('.buttonlink');

    navLinks.forEach(link => {
        // Tilføj hover effekt
        link.style.transition = 'all 0.2s ease';
        
        // Tilføj ikoner baseret på link tekst
        const linkText = link.textContent.trim().toLowerCase();
        let icon = '📄'; // Standard ikon

        switch(linkText) {
            case 'forside':
                icon = '🏠';
                break;
            case 'skema':
                icon = '📅';
                break;
            case 'studieplan':
                icon = '📚';
                break;
            case 'fravær':
                icon = '📊';
                break;
            case 'opgaver':
                icon = '✏️';
                break;
            case 'lektier':
                icon = '📝';
                break;
            case 'karakterer':
                icon = '🎯';
                break;
            case 'bøger':
                icon = '📖';
                break;
            case 'spørgeskema':
                icon = '📋';
                break;
            case 'dokumenter':
                icon = '📁';
                break;
            case 'beskeder':
                icon = '✉️';
                break;
            case 'profil':
                icon = '👤';
                break;
        }

        // Tilføj ikon til link hvis det ikke er pirat-knappen
        const anchor = link.querySelector('a');
        if (anchor && !anchor.innerHTML.includes('🏴‍☠️')) {
            const originalText = anchor.textContent;
            anchor.innerHTML = `${icon} ${originalText}`;
            
            // Styling for links
            anchor.style.display = 'flex';
            anchor.style.alignItems = 'center';
            anchor.style.gap = '5px';
            anchor.style.padding = '5px 10px';
            anchor.style.borderRadius = '4px';
            anchor.style.textDecoration = 'none';
            
            // Hover effekt
            anchor.addEventListener('mouseenter', () => {
                anchor.style.backgroundColor = '#f0f0f0';
            });
            
            anchor.addEventListener('mouseleave', () => {
                anchor.style.backgroundColor = '';
            });
        }
    });
};

// Fjern denne del, da vi nu kalder funktionen direkte i content.js
/* if (typeof window.LectioEnhancer.enhanceLectio !== 'undefined') {
    const originalEnhanceLectio = window.LectioEnhancer.enhanceLectio;
    window.LectioEnhancer.enhanceLectio = function() {
        originalEnhanceLectio();
        window.LectioEnhancer.enhanceNavigation();
    };
} */ 