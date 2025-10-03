window.LectioEnhancer = window.LectioEnhancer || {};

// Funktion til at skjule elementer med ls-dfv-100-IG klasse
window.LectioEnhancer.hideElementsWithClass = function() {
  const elements = document.querySelectorAll('.ls-dfv-100-IG');
  let hiddenCount = 0;
  
  elements.forEach((element) => {
    if (element.style.display !== 'none') {
      element.style.display = 'none';
      hiddenCount++;
    }
  });
  
  console.log(`Skjulte ${hiddenCount} elementer med ls-dfv-100-IG klasse`);
  return hiddenCount;
};

// Funktion til at vise elementer med ls-dfv-100-IG klasse igen
window.LectioEnhancer.showElementsWithClass = function() {
  const elements = document.querySelectorAll('.ls-dfv-100-IG');
  let shownCount = 0;
  
  elements.forEach((element) => {
    if (element.style.display === 'none') {
      element.style.display = '';
      shownCount++;
    }
  });
  
  console.log(`Viste ${shownCount} elementer med ls-dfv-100-IG klasse igen`);
  return shownCount;
};

// Funktion til at tælle elementer med ls-dfv-100-IG klasse
window.LectioEnhancer.countElementsWithClass = function() {
  const elements = document.querySelectorAll('.ls-dfv-100-IG');
  const hiddenElements = document.querySelectorAll('.ls-dfv-100-IG[style*="display: none"]');
  
  return {
    total: elements.length,
    hidden: hiddenElements.length,
    visible: elements.length - hiddenElements.length
  };
};

// MutationObserver til at automatisk skjule nye elementer med ls-dfv-100-IG klasse
window.LectioEnhancer.initAutoHideObserver = function() {
  const observer = new MutationObserver((mutations) => {
    let hasNewElements = false;
    
    mutations.forEach((mutation) => {
      // Tjek for nye tilføjede noder
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Tjek om noden selv har klassen
          if (node.classList && node.classList.contains('ls-dfv-100-IG')) {
            hasNewElements = true;
          }
          
          // Tjek om noden indeholder elementer med klassen
          const elementsWithClass = node.querySelectorAll && node.querySelectorAll('.ls-dfv-100-IG');
          if (elementsWithClass && elementsWithClass.length > 0) {
            hasNewElements = true;
          }
        }
      });
    });
    
    // Hvis der er nye elementer, skjul dem automatisk
    if (hasNewElements) {
      setTimeout(() => {
        LectioEnhancer.hideElementsWithClass();
      }, 100); // Vent 100ms for at sikre at elementerne er fuldt indlæst
    }
  });
  
  // Start observation af hele dokumentet
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('Auto-hide observer startet for ls-dfv-100-IG elementer');
  
  return observer;
};

// Funktion til at vise elementer info i konsollen
window.LectioEnhancer.displayElementsInfo = function() {
  const info = LectioEnhancer.countElementsWithClass();
  console.log('ls-dfv-100-IG elementer:', info);
  return info;
};
