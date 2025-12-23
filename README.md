# Mech Shop Manager

A Progressive Web App (PWA) for managing heavy duty mechanic shop operations.

## Features

- **Dashboard**: Overview of active jobs, pending work, equipment, and parts inventory
- **Work Orders**: Track and manage repair jobs with status, priority, and assignments
- **Equipment Management**: Keep detailed records of heavy equipment (excavators, loaders, dozers, dump trucks)
- **Parts Inventory**: Track parts stock levels with low-stock alerts
- **Offline Support**: Works offline with service worker caching
- **Installable**: Can be installed as a standalone app on mobile and desktop

## Getting Started

### Running the App

1. Open the project folder in VS Code
2. Install the Live Server extension (if not already installed)
3. Right-click on `index.html` and select "Open with Live Server"
4. The app will open in your browser at `http://localhost:5500`

### Installing as PWA

1. Open the app in Chrome, Edge, or another PWA-compatible browser
2. Click the "Install App" button in the header (or use the browser's install prompt)
3. The app will be installed and can be launched like a native application

## Technology Stack

- **HTML5**: Semantic markup and structure
- **CSS3**: Responsive design with modern layouts (Grid, Flexbox)
- **Vanilla JavaScript**: No frameworks - pure ES6+ JavaScript
- **Service Workers**: Offline functionality and caching
- **LocalStorage**: Client-side data persistence
- **Web Manifest**: PWA configuration

## Data Storage

All data is stored locally in the browser's LocalStorage. This means:
- Data persists between sessions
- Data is device-specific
- No backend server required
- Privacy-focused (data never leaves the device)

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Any modern browser with PWA support

## Future Enhancements

- Backend integration for multi-device sync
- Photo attachments for jobs and equipment
- PDF report generation
- Barcode scanning for parts
- Service reminder notifications
- Time tracking for labor hours
- Cost estimation and invoicing

## License

MIT License - Feel free to use and modify for your needs.
