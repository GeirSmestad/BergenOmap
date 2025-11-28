import { CoordinateStore } from './state/coordinateStore.js';
import { RegistrationStore } from './state/registrationStore.js';
import { createMapViewController } from './controllers/mapViewController.js';
import { createOverlayController } from './controllers/overlayController.js';
import { initCoordinatePanel } from './ui/coordinatePanel.js';
import { createPreviewController } from './controllers/previewController.js';
import { initRegisterActions } from './actions/registerActions.js';
import { initfileDropService } from './services/fileDropService.js';

document.addEventListener('DOMContentLoaded', () => {
  const coordinateStore = new CoordinateStore();
  const registrationStore = new RegistrationStore();

  const basemapToggleButton = document.getElementById('basemapToggleButton');
  const mapViewController = createMapViewController({ coordinateStore, basemapToggleButton });

  const overlayController = createOverlayController({
    coordinateStore,
    onOverlayLoaded: () => mapViewController.map.invalidateSize()
  });

  window.map = mapViewController.map;

  initCoordinatePanel({
    coordinateStore,
    latLonElements: [
      document.getElementById('latLon1'),
      document.getElementById('latLon2'),
      document.getElementById('latLon3')
    ],
    xyElements: [
      document.getElementById('xy1'),
      document.getElementById('xy2'),
      document.getElementById('xy3')
    ]
  });

  const previewController = createPreviewController({
    map: mapViewController.map,
    registrationStore
  });

  initRegisterActions({
    coordinateStore,
    registrationStore,
    overlayController,
    previewController,
    elements: {
      processButton: document.getElementById('processButton'),
      registerMapFromJsonButton: document.getElementById('registerMapFromJsonButton'),
      registrationPreviewButton: document.getElementById('registrationPreviewButton'),
      outputDatabaseButton: document.getElementById('outputDatabaseButton'),
      outputTextarea: document.getElementById('output'),
      outputImage: document.getElementById('outputImage')
    }
  });

  initfileDropService({
    dropArea: document.getElementById('drop-area'),
    registrationStore,
    onOverlayReady: (url) => overlayController.setSource(url),
    onStatusMessage: (message) => console.warn(message)
  });
});

