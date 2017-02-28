'use strict';

var remote = require('electron').remote,
    Menu = remote.Menu,
    MenuItem = remote.MenuItem,
    app = remote.app;

var viewSubmenu = [
  {
    label: 'Toggle Full Screen',
    accelerator: (function() {
      return process.platform == 'darwin' ? 'Ctrl+Command+F' : 'F11';
    })(),
    click: function(item, focusedWindow) {
      if (focusedWindow)
        focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
    }
  },
  {
    label: 'Next Data',
    accelerator: (function() {
      return 'Shift+down';
    })(),
    click: function(item, focusedWindow) {
      if (focusedWindow)
        focusedWindow.webContents.send('move-next');
    }
  },
  {
    label: 'Previous Data',
    accelerator: (function() {
      return 'Shift+up';
    })(),
    click: function(item, focusedWindow) {
      if (focusedWindow)
        focusedWindow.webContents.send('move-prev');
    }
  },
];

if (process.env.DEV_ENV === 'development') {
  viewSubmenu.push({
    label: 'Reload',
    accelerator: 'CmdOrCtrl+R',
    click: function(item, focusedWindow) {
      if (focusedWindow)
        focusedWindow.reload();
    }
  });
  viewSubmenu.push({
    label: 'Toggle Developer Tools',
    accelerator: (function() {
      return process.platform == 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I';
    })(),
    click: function(item, focusedWindow) {
      if (focusedWindow)
        focusedWindow.toggleDevTools();
    }
  });
}

var template = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Open Data Directory…',
                accelerator: 'CmdOrCtrl+O',
                click: function(item, focusedWindow) {
                    $('.select-dir-btn').click();
                }
            },
            {
                label: 'Export As…',
                // accelerator: 'CmdOrCtrl+S',
                click: function(item, focusedWindow) {
                    $('#exportas').click();
                }
            }
        ]
  },
  {
    label: 'Edit',
    submenu: [
      {
        label: 'Undo',
        accelerator: 'CmdOrCtrl+Z',
        role: 'undo'
      },
      {
        label: 'Redo',
        accelerator: 'Shift+CmdOrCtrl+Z',
        role: 'redo'
      },
      {
        type: 'separator'
      },
      {
        label: 'Cut',
        accelerator: 'CmdOrCtrl+X',
        role: 'cut'
      },
      {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        role: 'copy'
      },
      {
        label: 'Paste',
        accelerator: 'CmdOrCtrl+V',
        role: 'paste'
      },
      {
        label: 'Select All',
        accelerator: 'CmdOrCtrl+A',
        role: 'selectall'
      },
      {
        label: 'Find',
        accelerator: 'CmdOrCtrl+F',
        click: function(item, focusedWindow) {
          if (focusedWindow)
            focusedWindow.webContents.send('focus-search');
        }
      },
    ]
  },
  {
    label: 'View',
    submenu: viewSubmenu
  },
  {
    label: 'Window',
    role: 'window',
    submenu: [
      {
        label: 'Minimize',
        accelerator: 'CmdOrCtrl+M',
        role: 'minimize'
      },
      {
        label: 'Close',
        accelerator: 'CmdOrCtrl+W',
        role: 'close'
      },
    ]
  },
  {
    label: 'Help',
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click: function() { require('shell').openExternal('http://electron.atom.io') }
      },
    ]
  },
];

if (process.platform == 'darwin') {
  // var name = remote.require('app').getName();
  var name = require('electron').remote.app.getName();
  template.unshift({
    label: name,
    submenu: [
      {
        label: 'About ' + name,
        role: 'about'
      },
      {
        type: 'separator'
      },
      {
        label: 'Preference',
        accelerator: 'Command+,',
        click: function() {
            $('#preference').click();
        }
      },
      // {
      //   label: 'Preference2',
      //   accelerator: 'Command+.',
      //   click: function() {
      //       var bw = new browserWindow({
      //           height: 500,
      //           width: 500,
      //           'min-height': 500,
      //           'min-width': 500,
      //           'always-on-top': true
      //       });
      //       bw.loadUrl('file://' + __dirname + '/../preference/preference.html');
      //       bw.on('closed', function() {
      //           bw = null;
      //       });
      //       bw.openDevTools();
      //
      //   }
      // },
      {
        type: 'separator'
      },
      {
        label: 'Services',
        role: 'services',
        submenu: []
      },
      {
        type: 'separator'
      },
      {
        label: 'Hide ' + name,
        accelerator: 'Command+H',
        role: 'hide'
      },
      {
        label: 'Hide Others',
        accelerator: 'Command+Shift+H',
        role: 'hideothers'
      },
      {
        label: 'Show All',
        role: 'unhide'
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: function() { app.quit(); }
      },
    ]
  });
  // Window menu.
  template[3].submenu.push(
    {
      type: 'separator'
    },
    {
      label: 'Bring All to Front',
      role: 'front'
    }
  );
}

Menu.setApplicationMenu(Menu.buildFromTemplate(template));
