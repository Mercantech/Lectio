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
            
            // Tilføj kopier-knap
            addCopyTableButton(scheduleTable);

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

// Tilføj "Kopier tabel"-knap direkte i tabellen
function addCopyTableButton(table) {
    if (table.parentNode.querySelector('.copy-table-btn')) return; // Undgå dubletter
    const btn = document.createElement('button');
    btn.textContent = 'Kopier tabel';
    btn.className = 'copy-table-btn';
    btn.style.margin = '10px 0';
    btn.onclick = () => copyVisibleTableRows(table);
    table.parentNode.insertBefore(btn, table);
}

function copyVisibleTableRows(table) {
    let rows = Array.from(table.querySelectorAll('tr'));
    let output = [];
    rows.forEach(row => {
        if (row.style.display === 'none') return;
        let cells = Array.from(row.children).map(cell => cell.innerText.trim());
        output.push(cells.join('\t'));
    });
    const text = output.join('\n');
    navigator.clipboard.writeText(text).then(() => {
        alert('Tabel kopieret til udklipsholderen!');
    });
} 