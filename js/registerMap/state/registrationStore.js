export class RegistrationStore {
  constructor() {
    this.droppedImage = null;
    this.currentRegistrationData = {};
    this.currentOverlayImageUrl = null;
  }

  setDroppedImage(file) {
    this.droppedImage = file;
  }

  getDroppedImage() {
    return this.droppedImage;
  }

  setRegistrationData(data) {
    this.currentRegistrationData = data;
  }

  getRegistrationData() {
    return this.currentRegistrationData;
  }

  setOverlayImageUrl(url) {
    this.currentOverlayImageUrl = url;
  }

  getOverlayImageUrl() {
    return this.currentOverlayImageUrl;
  }

  getRegistrationMetadata() {
    const getValue = (id) => {
      const element = document.getElementById(id);
      return element ? element.value : '';
    };

    return {
      map_name: getValue('mapName'),
      map_filename: getValue('filename'),
      attribution: getValue('attribution'),
      map_area: getValue('mapArea'),
      map_event: getValue('mapEvent'),
      map_date: getValue('mapDate'),
      map_course: getValue('mapCourse'),
      map_club: getValue('mapClub'),
      map_course_planner: getValue('mapCoursePlanner'),
      map_attribution: getValue('mapAttribution')
    };
  }
}

