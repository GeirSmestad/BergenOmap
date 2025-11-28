import { CoordinateStore } from './state/coordinateStore.js';
import { RegistrationStore } from './state/registrationStore.js';
import { createMapView } from './map/mapView.js';
import { createOverlayController } from './overlay/overlayController.js';
import { initCoordinatePanel } from './ui/coordinatePanel.js';
import { createPreviewController } from './preview/previewController.js';
import { initRegisterActions } from './actions/registerActions.js';
import { initFileService } from './services/fileService.js';

document.addEventListener('DOMContentLoaded', () => {
  const coordinateStore = new CoordinateStore();
  const registrationStore = new RegistrationStore();

  const basemapToggleButton = document.getElementById('basemapToggleButton');
  const mapView = createMapView({ coordinateStore, basemapToggleButton });

  const overlayController = createOverlayController({
    coordinateStore,
    onOverlayLoaded: () => mapView.map.invalidateSize()
  });

  window.map = mapView.map;

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
    map: mapView.map,
    registrationStore
  });

  initRegisterActions({
    coordinateStore,
    registrationStore,
    overlayController,
    previewController,
    elements: {
      processButton: document.getElementById('processButton'),
      registerFromJsonButton: document.getElementById('registerFromJsonButton'),
      registrationPreviewButton: document.getElementById('registrationPreviewButton'),
      outputDatabaseButton: document.getElementById('outputDatabaseButton'),
      outputTextarea: document.getElementById('output'),
      outputImage: document.getElementById('outputImage')
    }
  });

  initFileService({
    dropArea: document.getElementById('drop-area'),
    registrationStore,
    onOverlayReady: (url) => overlayController.setSource(url),
    onStatusMessage: (message) => console.warn(message)
  });
});

