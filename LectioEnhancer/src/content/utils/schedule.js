window.LectioEnhancer = window.LectioEnhancer || {};

window.LectioEnhancer.enhanceSchedulePage = function() {
    // Tjek om vi er på skema-siden
    if (!window.location.href.includes('SkemaNy.aspx')) return;

    // Vent på at skemaet er indlæst
    const observer = new MutationObserver((mutations, obs) => {
        const scheduleTable = document.querySelector('.s2skema');
        if (scheduleTable) {
            obs.disconnect(); // Stop observation når skemaet er fundet
            
            // Anvend farver
            LectioEnhancer.applyGroupColors();
            
            // Fortsæt med at observere ændringer i skemaet
            observeScheduleChanges();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
};

function observeScheduleChanges() {
    const scheduleObserver = new MutationObserver((mutations) => {
        // Hvis der er ændringer i skemaet, genanvend farverne
        LectioEnhancer.applyGroupColors();
    });

    const scheduleTable = document.querySelector('.s2skema');
    if (scheduleTable) {
        scheduleObserver.observe(scheduleTable, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style']
        });
    }
} 