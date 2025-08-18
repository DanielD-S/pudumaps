import React, { useState } from "react";
import LayerStylePanel from "./LayerStylePanel";
import MapView from "./MapView";
import "../css/AppLayout.css";

export default function AppLayout() {
  const [showPanel, setShowPanel] = useState(true);

  return (
    <div className="app-container">
      {/* Sidebar */}
      {showPanel && (
        <aside className="sidebar">
          <LayerStylePanel
            layers={[]} // Aquí pasas tus layers
            styles={{}} // Aquí pasas tus estilos
            onLocalChange={() => {}} // callback real
          />
        </aside>
      )}

      {/* Mapa */}
      <main className="map-container">
        <MapView layers={[]} visible={{}} styles={{}} ref={null} />

        {/* Botón flotante solo en móvil/tablet */}
        <button
          className="toggle-panel-btn"
          onClick={() => setShowPanel(!showPanel)}
        >
          ⚙️ Estilos
        </button>
      </main>
    </div>
  );
}
