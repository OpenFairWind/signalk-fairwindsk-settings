const express = require('express');
const path = require('path');
const fs = require('fs').promises;

module.exports = function (app) {
  const plugin = {
    id: 'signalk-fairwindsk-settings',
    name: 'FairWindSK Settings',
    description: 'Settings management plugin and webapp for FairWindSK with folder-based app organization'
  };

  let configFilePath;
  let currentConfig = null;

  plugin.start = function (options) {
    app.debug('Plugin starting...');
    
    const configDir = app.config?.configPath || path.join(process.cwd(), '.signalk');
    configFilePath = path.join(configDir, 'fairwindsk.json');
    
    initializeConfig();
    setupRoutes();
    
    app.debug('Plugin started successfully');
  };

  plugin.stop = function () {
    app.debug('Plugin stopped');
  };

  plugin.schema = {
    type: 'object',
    properties: {
      configPath: {
        type: 'string',
        title: 'Custom configuration file path (optional)',
        description: 'Leave empty to use default .signalk/fairwindsk.json'
      }
    }
  };

  async function initializeConfig() {
    try {
      const data = await fs.readFile(configFilePath, 'utf8');
      currentConfig = JSON.parse(data);
      
      // Ensure folders structure exists
      if (!currentConfig.folders) {
        currentConfig.folders = getDefaultFolders();
      }
      if (!currentConfig.apps) {
        currentConfig.apps = [];
      }
      
      app.debug('Loaded existing configuration');
    } catch (err) {
      currentConfig = getDefaultConfig();
      await saveConfig(currentConfig);
      app.debug('Created default configuration');
    }
  }

  function getDefaultFolders() {
    return [
      {
        id: 'root',
        name: 'Root',
        path: '/',
        parent: null,
        order: 0
      },
      {
        id: 'navigation',
        name: 'Navigation',
        path: '/navigation',
        parent: 'root',
        order: 1
      },
      {
        id: 'instruments',
        name: 'Instruments',
        path: '/instruments',
        parent: 'root',
        order: 2
      },
      {
        id: 'utilities',
        name: 'Utilities',
        path: '/utilities',
        parent: 'root',
        order: 3
      }
    ];
  }

  function getDefaultConfig() {
    return {
      main: {
        virtualKeyboard: false,
        autopilot: '',
        windowMode: 'centered',
        windowWidth: 1024,
        windowHeight: 600,
        windowTop: 20,
        windowLeft: 0
      },
      folders: getDefaultFolders(),
      apps: [],
      signalk: {
        btw: 'navigation.course.calcValues.bearingTrue',
        cog: 'navigation.courseOverGroundTrue',
        dpt: 'environment.depth.belowTransducer',
        dtg: 'navigation.course.calcValues.distance',
        eta: 'navigation.course.calcValues.estimatedTimeOfArrival',
        hdg: 'navigation.headingTrue',
        pos: 'navigation.position',
        sog: 'navigation.speedOverGround',
        stw: 'navigation.speedThroughWater',
        ttg: 'navigation.course.calcValues.timeToGo',
        vmg: 'performance.velocityMadeGood',
        wpt: 'navigation.course.nextPoint',
        xte: 'navigation.course.calcValues.crossTrackError',
        rsa: 'steering.rudderAngle',
        'notifications.abandon': 'notifications.abandon',
        'notifications.adrift': 'notifications.adrift',
        'notifications.fire': 'notifications.fire',
        'notifications.pob': 'notifications.mob',
        'notifications.piracy': 'notifications.piracy',
        'notifications.sinking': 'notifications.sinking',
        'notifications.anchor': 'notifications.anchor',
        notifications: 'notifications',
        'anchor.bearing': 'navigation.anchor.bearingTrue',
        'anchor.radius': 'navigation.anchor.currentRadius',
        'anchor.distance': 'navigation.anchor.distanceFromBow',
        'anchor.fudge': 'navigation.anchor.fudgeFactor',
        'anchor.max': 'navigation.anchor.maxRadius',
        'anchor.meta': 'navigation.anchor.meta',
        'anchor.position': 'navigation.anchor.position',
        'anchor.depth': 'environment.depth.belowTransducer',
        'anchor.rode': 'winches.windlass.rode',
        'anchor.actions.up': 'plugins.windlassctl.up',
        'anchor.actions.down': 'plugins.windlassctl.down',
        'anchor.actions.reset': 'plugins.windlassctl.reset',
        'anchor.actions.release': 'plugins.windlassctl.release',
        'anchor.actions.drop': 'plugins.anchoralarm.dropAnchor',
        'anchor.actions.raise': 'plugins.anchoralarm.raiseAnchor',
        'anchor.actions.radius': 'plugins.anchoralarm.setRadius',
        'anchor.actions.rode': 'plugins.anchoralarm.setRodeLength',
        'anchor.actions.set': 'plugins.anchoralarm.setManualAnchor',
        'pob.startTime': 'navigation.courseGreatCircle.activeRoute.startTime',
        'pob.bearing': 'navigation.course.calcValues.bearingTrue',
        'pob.distance': 'navigation.course.calcValues.distance',
        'autopilot.state': 'steering.autopilot.state',
        'autopilot.mode': 'steering.autopilot.mode',
        'autopilot.target.heading': 'steering.autopilot.target.headingMagnetic',
        'autopilot.target.windAngle': 'steering.autopilot.target.windAngleApparent'
      },
      units: {
        airPressure: 'hPa',
        airTemperature: 'C',
        waterTemperature: 'C',
        depth: 'mt',
        distance: 'nm',
        range: 'rm',
        vesselSpeed: 'kn',
        windSpeed: 'kn'
      },
      applications: {
        autopilot: '@signalk/signalk-autopilot',
        anchor: 'signalk-anchoralarm-plugin',
        mydata: 'signalk-mydata-plugin'
      },
      bottomBar: ['', '', '', '']
    };
  }

  async function saveConfig(config) {
    try {
      await fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf8');
      currentConfig = config;
      app.debug('Configuration saved successfully');
      return true;
    } catch (err) {
      app.error('Error saving configuration:', err);
      return false;
    }
  }

  function setupRoutes() {
    const router = express.Router();

    // GET configuration
    router.get('/config', async (req, res) => {
      try {
        if (!currentConfig) {
          await initializeConfig();
        }
        res.json(currentConfig);
      } catch (err) {
        app.error('Error getting configuration:', err);
        res.status(500).json({ error: 'Failed to get configuration' });
      }
    });

    // PUT configuration (full replace)
    router.put('/config', express.json(), async (req, res) => {
      try {
        const success = await saveConfig(req.body);
        if (success) {
          res.json({ success: true, message: 'Configuration saved' });
        } else {
          res.status(500).json({ error: 'Failed to save configuration' });
        }
      } catch (err) {
        app.error('Error updating configuration:', err);
        res.status(500).json({ error: 'Failed to update configuration' });
      }
    });

    // PATCH configuration (partial update)
    router.patch('/config', express.json(), async (req, res) => {
      try {
        if (!currentConfig) {
          await initializeConfig();
        }
        
        currentConfig = deepMerge(currentConfig, req.body);
        const success = await saveConfig(currentConfig);
        
        if (success) {
          res.json({ success: true, message: 'Configuration updated' });
        } else {
          res.status(500).json({ error: 'Failed to update configuration' });
        }
      } catch (err) {
        app.error('Error patching configuration:', err);
        res.status(500).json({ error: 'Failed to patch configuration' });
      }
    });

    // POST reset to defaults
    router.post('/config/reset', async (req, res) => {
      try {
        const defaultConfig = getDefaultConfig();
        const success = await saveConfig(defaultConfig);
        
        if (success) {
          res.json({ success: true, message: 'Configuration reset to defaults' });
        } else {
          res.status(500).json({ error: 'Failed to reset configuration' });
        }
      } catch (err) {
        app.error('Error resetting configuration:', err);
        res.status(500).json({ error: 'Failed to reset configuration' });
      }
    });

    // Serve static webapp files
    router.use(express.static(path.join(__dirname, 'public')));

    app.use('/plugins/fairwindsk-settings', router);
  }

  function deepMerge(target, source) {
    const output = Object.assign({}, target);
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  return plugin;
};
