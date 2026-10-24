const {app,BrowserWindow,shell,Menu}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
let local,mainWindow;
app.setName('F&M Journal');
const mobileQa=process.argv.includes('--mobile-qa');
if(mobileQa)app.setPath('userData',path.join(app.getPath('temp'),'fm-journal-mobile-qa'));
if(!app.requestSingleInstanceLock())app.quit();
app.on('second-instance',()=>{mainWindow?.show();mainWindow?.focus();});
app.whenReady().then(async()=>{
 const {createApp}=await import(pathToFileURL(path.join(__dirname,'../server/index.mjs')).href);
 // A stable loopback origin preserves local storage across launches, entirely offline.
 const opts={cloudProxy:'https://fmjournal-production.up.railway.app',staticDir:path.join(__dirname,'../dist'),origin:'http://127.0.0.1:43127'};
 const {app:web}=createApp(opts);local=web.listen(43127,'127.0.0.1',()=>{
 const win=new BrowserWindow({width:mobileQa?390:1440,height:mobileQa?844:980,minWidth:mobileQa?360:840,minHeight:650,title:'F&M Journal',backgroundColor:'#101211',titleBarStyle:mobileQa?'default':'hiddenInset',webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
 mainWindow=win;
 win.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\/(www\.amerika\.social|altstack\.org|github\.com)\//.test(url))shell.openExternal(url);return {action:'deny'};});
 win.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith(opts.origin+'/')){e.preventDefault();if(url.startsWith('https://'))shell.openExternal(url);}});
 if(process.argv.includes('--smoke-test')){
  const timeout=setTimeout(()=>app.exit(1),30000);
  win.webContents.on('did-fail-load',()=>app.exit(1));
  win.webContents.on('did-finish-load',async()=>{try{const okay=await win.webContents.executeJavaScript("document.querySelector('h1')?.textContent.includes('in tune') && document.querySelectorAll('button').length > 15");clearTimeout(timeout);app.exit(okay?0:1);}catch{app.exit(1);}});
 }
 win.loadURL(opts.origin);
 });
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:app.name,submenu:[{role:'about'},{type:'separator'},{role:'quit'}]},{role:'editMenu'},{role:'viewMenu'},{role:'windowMenu'}]));
 app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)app.relaunch(),app.exit();});
}).catch(error=>{console.error('F&M Journal could not start:',error.message);app.exit(1);});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
app.on('before-quit',()=>local?.close());
