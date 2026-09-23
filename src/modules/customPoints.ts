import * as Cesium from 'cesium';

export interface CustomPoint {
  id: string;
  name: string;
  category: 'viewpoint' | 'camp' | 'heritage' | 'nature' | 'custom';
  latitude: number;
  longitude: number;
  altitude?: number;
  description?: string;
  createdAt: number;
}

const STORAGE_KEY = 'kutch_3d_custom_points';

const CATEGORY_COLORS: Record<string, string> = {
  viewpoint: '#38bdf8', // Electric Cyan
  camp: '#f59e0b',      // Warm Amber
  heritage: '#a855f7',  // Royal Purple
  nature: '#10b981',    // Emerald Green
  custom: '#f43f5e'     // Vibrant Rose
};

const CATEGORY_EMOJIS: Record<string, string> = {
  viewpoint: '📍',
  camp: '🎪',
  heritage: '🏛️',
  nature: '🦩',
  custom: '⭐'
};

// Default seed landmarks so the map has rich 3D points from day one
export const SEED_POINTS: CustomPoint[] = [
  {
    id: 'seed-white-desert-viewpoint',
    name: 'White Desert Sunset Viewpoint',
    category: 'viewpoint',
    latitude: 23.8304,
    longitude: 69.5201,
    altitude: 10,
    description: 'The iconic viewing deck on the crystalline white salt desert floor, famous for full-moon and sunset reflections.',
    createdAt: Date.now() - 100000
  },
  {
    id: 'seed-tent-city-dhordo',
    name: 'Rann Utsav Tent City',
    category: 'camp',
    latitude: 23.8037,
    longitude: 69.5092,
    altitude: 15,
    description: 'Vibrant cultural hub of the annual Rann festival featuring luxury tents, handicraft bazaars, and folk performances.',
    createdAt: Date.now() - 90000
  },
  {
    id: 'seed-kalo-dungar',
    name: 'Kalo Dungar (Black Hills - 462m)',
    category: 'viewpoint',
    latitude: 23.9167,
    longitude: 69.8167,
    altitude: 462,
    description: 'The highest mountain peak in Kutch offering dramatic 3D cliff relief and panoramic vistas overlooking the Great Rann.',
    createdAt: Date.now() - 80000
  },
  {
    id: 'seed-dholavira-harappan',
    name: 'Dholavira UNESCO World Heritage Site',
    category: 'heritage',
    latitude: 23.8864,
    longitude: 70.2131,
    altitude: 20,
    description: '5000-year-old Indus Valley Civilization metropolis famous for sophisticated water reservoirs and stone fortifications.',
    createdAt: Date.now() - 70000
  }
];

export class CustomPointsManager {
  private viewer: Cesium.Viewer;
  private dataSource: Cesium.CustomDataSource;
  private points: CustomPoint[] = [];
  private handler: Cesium.ScreenSpaceEventHandler | null = null;
  private isAddMode = false;
  private onPointsUpdatedCallback: ((points: CustomPoint[]) => void) | null = null;
  private onPointSelectedCallback: ((point: CustomPoint) => void) | null = null;
  private onAddModeChangedCallback: ((isActive: boolean) => void) | null = null;
  private onMapClickForNewPointCallback: ((lat: number, lon: number) => void) | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.dataSource = new Cesium.CustomDataSource('user-custom-points');
    this.viewer.dataSources.add(this.dataSource);

    this.loadPoints();
    this.initInteraction();
  }

  /**
   * Loads points from localStorage or populates default seed points.
   */
  private loadPoints(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        this.points = JSON.parse(raw);
      } catch {
        this.points = [...SEED_POINTS];
      }
    } else {
      this.points = [...SEED_POINTS];
      this.saveToStorage();
    }
    this.renderAllEntities();
  }

  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.points));
    if (this.onPointsUpdatedCallback) {
      this.onPointsUpdatedCallback([...this.points]);
    }
  }

  /**
   * Creates an SVG pin icon data URL with category color.
   */
  private createPinSvg(color: string, label: string): string {
    const svg = `
      <svg width="40" height="52" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <filter id="shadow" x="0" y="0" width="40" height="52" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.6"/>
        </filter>
        <g filter="url(#shadow)">
          <path d="M20 4C11.163 4 4 11.163 4 20C4 30.5 20 44 20 44C20 44 36 30.5 36 20C36 11.163 28.837 4 20 4Z" fill="${color}"/>
          <path d="M20 5C11.716 5 5 11.716 5 20C5 29.8 19.5 42.6 20 43C20.5 42.6 35 29.8 35 20C35 11.716 28.284 5 20 5Z" stroke="#FFFFFF" stroke-width="1.8"/>
          <circle cx="20" cy="20" r="9" fill="#0B0F19"/>
          <text x="20" y="24" text-anchor="middle" font-size="11" font-family="-apple-system, sans-serif" fill="#FFFFFF">${label}</text>
        </g>
      </svg>
    `;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /**
   * Renders a 3D Entity for a point on the Cesium globe.
   */
  private renderPointEntity(point: CustomPoint): void {
    const colorHex = CATEGORY_COLORS[point.category] || '#38bdf8';
    const emoji = CATEGORY_EMOJIS[point.category] || '📍';
    const pinImage = this.createPinSvg(colorHex, emoji);
    const position = Cesium.Cartesian3.fromDegrees(point.longitude, point.latitude, point.altitude || 0);

    const entity = this.dataSource.entities.add({
      id: point.id,
      name: point.name,
      position: position,
      billboard: {
        image: pinImage,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY, // Always render cleanly in front of terrain
        scale: 0.95
      },
      label: {
        text: point.name,
        font: '600 12px "Outfit", -apple-system, sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.fromCssColorString('#0B0F19'),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -56),
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        backgroundColor: Cesium.Color.fromCssColorString('#0F172A').withAlpha(0.85),
        showBackground: true,
        backgroundPadding: new Cesium.Cartesian2(6, 4)
      }
    });

    // Store custom data on entity
    (entity as any).customPointData = point;
  }

  private renderAllEntities(): void {
    this.dataSource.entities.removeAll();
    for (const point of this.points) {
      this.renderPointEntity(point);
    }
  }

  /**
   * Sets up click handlers on the Cesium canvas.
   */
  private initInteraction(): void {
    this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);

    // Left click handling
    this.handler.setInputAction((click: any) => {
      // 1. If in "Add Point" mode, pick the clicked 3D geographic coordinates
      if (this.isAddMode) {
        const ray = this.viewer.camera.getPickRay(click.position);
        if (!ray) return;

        let cartesian: Cesium.Cartesian3 | undefined;
        if (this.viewer.scene.globe) {
          cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);
        }
        if (!cartesian) {
          cartesian = this.viewer.camera.pickEllipsoid(click.position, this.viewer.scene.globe.ellipsoid);
        }

        if (cartesian) {
          const carto = Cesium.Cartographic.fromCartesian(cartesian);
          const lat = Cesium.Math.toDegrees(carto.latitude);
          const lon = Cesium.Math.toDegrees(carto.longitude);

          this.setAddMode(false);
          if (this.onMapClickForNewPointCallback) {
            this.onMapClickForNewPointCallback(lat, lon);
          }
        }
        return;
      }

      // 2. Otherwise, check if user clicked an existing 3D point entity
      const pickedObject = this.viewer.scene.pick(click.position);
      if (Cesium.defined(pickedObject) && pickedObject.id && (pickedObject.id as any).customPointData) {
        const pointData = (pickedObject.id as any).customPointData as CustomPoint;
        if (this.onPointSelectedCallback) {
          this.onPointSelectedCallback(pointData);
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  /**
   * Adds a new point and renders it in 3D.
   */
  public addPoint(data: Omit<CustomPoint, 'id' | 'createdAt'>): CustomPoint {
    const newPoint: CustomPoint = {
      ...data,
      id: 'point-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: Date.now()
    };

    this.points.unshift(newPoint);
    this.renderPointEntity(newPoint);
    this.saveToStorage();

    // Fly camera directly to newly added point in dramatic 3D
    this.flyToPoint(newPoint.id);

    return newPoint;
  }

  /**
   * Deletes a point by ID.
   */
  public deletePoint(id: string): void {
    this.points = this.points.filter(p => p.id !== id);
    const entity = this.dataSource.entities.getById(id);
    if (entity) {
      this.dataSource.entities.remove(entity);
    }
    this.saveToStorage();
  }

  /**
   * Fly camera to point with 3D tilted horizon perspective.
   */
  public flyToPoint(id: string): void {
    const point = this.points.find(p => p.id === id);
    if (!point) return;

    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        point.longitude,
        point.latitude - 0.015, // Offset south so the pin is framed centrally
        1500.0                   // Altitude in meters
      ),
      orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-28.0), // Oblique 3D pitch
        roll: 0.0
      },
      duration: 2.2,
      easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT
    });
  }

  public setAddMode(active: boolean): void {
    this.isAddMode = active;
    if (this.onAddModeChangedCallback) {
      this.onAddModeChangedCallback(active);
    }

    // Change mouse cursor over canvas
    const canvas = this.viewer.scene.canvas;
    if (active) {
      canvas.style.cursor = 'crosshair';
    } else {
      canvas.style.cursor = 'default';
    }
  }

  public getPoints(): CustomPoint[] {
    return [...this.points];
  }

  public onPointsUpdated(cb: (points: CustomPoint[]) => void): void {
    this.onPointsUpdatedCallback = cb;
  }

  public onPointSelected(cb: (point: CustomPoint) => void): void {
    this.onPointSelectedCallback = cb;
  }

  public onAddModeChanged(cb: (isActive: boolean) => void): void {
    this.onAddModeChangedCallback = cb;
  }

  public onMapClickForNewPoint(cb: (lat: number, lon: number) => void): void {
    this.onMapClickForNewPointCallback = cb;
  }

  public destroy(): void {
    if (this.handler) {
      this.handler.destroy();
      this.handler = null;
    }
    this.viewer.dataSources.remove(this.dataSource);
  }
}
