window.LectioEnhancer = window.LectioEnhancer || {};

window.LectioEnhancer.applyGroupColors = function() {
  chrome.storage.sync.get(["courseGroupColors", "lectioEnhancerCourses"], (data) => {
    let groupColors = data.courseGroupColors || {};
    let courses = data.lectioEnhancerCourses || {};
    let hasNewColors = false;

    console.log('Tilgængelige kurser:', courses);

    document.querySelectorAll(".s2skemabrik").forEach((element) => {
      const holdElements = element.querySelectorAll('[data-lectiocontextcard^="HE"]');
      const holdNames = Array.from(holdElements).map(el => el.textContent.trim());
      
      console.log('Skemabrik indeholder hold:', holdNames);
      
      const matchingCourse = Object.keys(courses).find(course => 
        holdNames.some(holdName => holdName === course)
      );

      console.log('Matchende kursus:', matchingCourse);

      if (matchingCourse) {
        console.log('Fandt match for:', matchingCourse);
        
        if (!groupColors[matchingCourse]) {
          const backgroundColor = LectioEnhancer.generateRandomColor();
          const borderColor = LectioEnhancer.generateBorderColor(backgroundColor);
          groupColors[matchingCourse] = {
            background: backgroundColor,
            border: borderColor,
          };
          hasNewColors = true;
          console.log('Ny farve genereret for:', matchingCourse, backgroundColor);
        }

        const currentStyle = element.getAttribute('style') || '';
        const updatedStyle = currentStyle
          .replace(/background-color:[^;]+;?/, '')
          .replace(/border-left:[^;]+;?/, '');
        
        const newStyle = `
          ${updatedStyle}
          background-color: ${groupColors[matchingCourse].background} !important;
          border-left: 4px solid ${groupColors[matchingCourse].border} !important;
        `.trim();
        
        console.log('Anvendt style:', newStyle);
        element.setAttribute('style', newStyle);
      }
    });

    if (hasNewColors) {
      chrome.storage.sync.set({ courseGroupColors: groupColors });
    }
  });
}; 