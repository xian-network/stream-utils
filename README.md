Please don't use the `xian-dapp-utils.mjs` included here but the newest one from the [dapp-utils repository](https://github.com/xian-network/dapp-utils).

# Xian Stream Manager

A modern, dark-themed web application for managing token streams on the Xian blockchain. Built with Svelte and Vite.

## Features

- 🌊 **Stream Management**: View, create, and manage token streams
- 📊 **Real-time Monitoring**: Track incoming and outgoing streams
- 🎛️ **Stream Controls**: Balance, finalize, forfeit, and close streams
- 👀 **Multi-wallet View**: View streams for any wallet address
- 📱 **Responsive Design**: Works on desktop and mobile
- 🌙 **Dark Theme**: Modern, sleek interface
- ❓ **Built-in FAQ**: Comprehensive help system

## Live Demo

The application is deployed on GitHub Pages: [https://YOUR_USERNAME.github.io/stream-utils/](https://YOUR_USERNAME.github.io/stream-utils/)

## Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Getting Started

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/stream-utils.git
cd stream-utils
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## GitHub Pages Deployment

This project is configured for automatic deployment to GitHub Pages using GitHub Actions.

### Setup Instructions

1. **Enable GitHub Pages**:
   - Go to your repository settings
   - Navigate to "Pages" section
   - Set source to "GitHub Actions"

2. **Push to main branch**:
   - The workflow will automatically trigger on push to main
   - The site will be deployed to `https://YOUR_USERNAME.github.io/stream-utils/`

3. **Manual Deployment** (if needed):
   - Go to the "Actions" tab in your repository
   - Run the "Deploy to GitHub Pages" workflow manually

### Configuration

- The site is configured to work with the `/stream-utils/` base path
- Static assets are properly handled for GitHub Pages
- The `.nojekyll` file prevents Jekyll processing

## Project Structure

```
src/
├── lib/
│   ├── svelte-components/
│   │   ├── Nav.svelte           # Navigation bar
│   │   ├── Section.svelte       # Main streams interface
│   │   ├── CreateStream.svelte  # Stream creation form
│   │   ├── FAQ.svelte          # FAQ accordion
│   │   └── Footer.svelte       # Site footer
│   ├── js/
│   │   ├── main.js             # Main utilities
│   │   ├── node.js             # Node interactions
│   │   ├── config.js           # Configuration
│   │   └── xian-dapp-utils.js  # Xian blockchain utils
│   └── store.js                # Svelte stores
├── app.css                     # Global styles
├── App.svelte                  # Root component
└── main.js                     # Application entry point
```

## Technologies Used

- **Frontend**: Svelte + Vite
- **Styling**: Bulma CSS + Custom Dark Theme
- **Icons**: Font Awesome
- **Blockchain**: Xian Network
- **Deployment**: GitHub Pages + GitHub Actions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- 📖 Check the built-in FAQ for common questions
- 💬 Join our [Telegram](https://t.me/xian_network)
- 🌐 Visit [Xian.org](https://xian.org) for more information
