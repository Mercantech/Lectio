# Lectio Enhancer

En Chrome extension der forbedrer brugeroplevelsen af Lectio med nye funktioner og et moderne design.

## Funktioner

### Skema Forbedringer

- **Farve Kodning**: Automatisk farvekodning af fag og hold for bedre overblik
- **Skjul Info Rækker**: Mulighed for at skjule/vise informationsrækker i skemaet
- **Dark Mode**: Indbygget dark mode for bedre læsbarhed

### Kursus Organisering

- **Kategorisering**: Automatisk gruppering af kurser baseret på fagkoder
- **Brugerdefinerede Kategorier**: Mulighed for at oprette egne kategorier
- **Drag-and-Drop**: Let organisering af kurser mellem kategorier

### Tilpasning

- **Farve Tilpasning**: Vælg dine egne farver for hver faggruppe
- **Gemte Præferencer**: Dine indstillinger gemmes automatisk

## Tekniske Detaljer

### Hovedkomponenter

#### Content Script (`content.js`)

- `enhanceSchedulePage()`: Initialiserer forbedringer på skemasiden
- `setupInfoRows()`: Håndterer visning/skjul af informationsrækker
- `applyGroupColors()`: Administrerer farvekodning af faggrupper
- `saveCourses()`: Gemmer og kategoriserer kurser

#### Popup Interface (`popup.js`)

- `setupMenu()`: Håndterer navigation i popup menuen
- `displayCourses()`: Viser og organiserer kursuslisten
- `setupCategoryControls()`: Administrerer brugerdefinerede kategorier

### Storage

Bruger Chrome's `storage.sync` API til at gemme:

- Kursusgrupperinger
- Farveindstillinger
- Brugerens præferencer

### Styling

Bruger moderne CSS med:

- Fleksibelt layout system
- Smooth transitions og animationer
- Responsivt design
- Dark mode understøttelse

## Installation

1. Download eller klon repository
2. Åbn Chrome Extensions (chrome://extensions/)
3. Aktiver "Developer mode"
4. Klik "Load unpacked" og vælg projektmappen

## Udvikling

### Struktur
