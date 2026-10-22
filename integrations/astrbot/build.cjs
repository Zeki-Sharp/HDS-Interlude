// SPDX-License-Identifier: AGPL-3.0-only
const path=require('node:path');
require('esbuild').buildSync({entryPoints:['src/index.ts'],bundle:true,platform:'node',format:'cjs',packages:'external',target:'node20',charset:'utf8',keepNames:true,outfile:'lib/index.js',absWorkingDir:path.resolve(__dirname,'../..'),tsconfig:path.join(__dirname,'tsconfig.json')});
