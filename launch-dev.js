import { pathToFileURL } from 'node:url';
process.chdir('C:\\Users\\DesignZone-JO\\Desktop\\ModricApp');
const vitePath = pathToFileURL('C:\\Users\\DesignZone-JO\\Desktop\\ModricApp\\node_modules\\vite\\bin\\vite.js').href;
await import(vitePath);
