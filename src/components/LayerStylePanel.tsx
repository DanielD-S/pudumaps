import React, { useState } from "react";
import type { ProjectLayer, LayerStyle } from "../types";
import "../css/LayerStylesPanel.css";

type Props = {
  layers: ProjectLayer[];
  styles: Record<string, LayerStyle>;
  onLocalChange: (layerId: string, patch: Partial<LayerStyle>) => void;
};

export default function LayerStylePanel({ layers, styles, onLocalChange }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="layer-style-container">
      {/* Cabecera del panel */}
      <div className="panel-header" onClick={() => setOpen(!open)}>
        <h3 className="panel-title">🎨 Estilos de capas</h3>
        <span className={`arrow ${open ? "open" : ""}`}>▾</span>
      </div>

      {/* Contenido colapsable */}
      <div className={`panel-body ${open ? "expanded" : "collapsed"}`}>
        {layers.map((l) => {
          const st = styles[l.id];
          if (!st) return null;

          return (
            <div key={l.id} className="style-card">
              <h4>{l.name}</h4>

              <div className="style-group">
                <label>Color línea</label>
                <input
                  type="color"
                  value={st.color}
                  onChange={(e) => onLocalChange(l.id, { color: e.target.value })}
                />

                <label>Grosor</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={st.weight}
                  onChange={(e) => onLocalChange(l.id, { weight: Number(e.target.value) })}
                />

                <label>Opacidad</label>
                <input
                  type="number"
                  step={0.05}
                  min={0}
                  max={1}
                  value={st.opacity}
                  onChange={(e) => onLocalChange(l.id, { opacity: Number(e.target.value) })}
                />
              </div>

              <hr />

              <div className="style-group">
                <label>Color relleno</label>
                <input
                  type="color"
                  value={st.fillColor}
                  onChange={(e) => onLocalChange(l.id, { fillColor: e.target.value })}
                />

                <label>Opacidad relleno</label>
                <input
                  type="number"
                  step={0.05}
                  min={0}
                  max={1}
                  value={st.fillOpacity}
                  onChange={(e) => onLocalChange(l.id, { fillOpacity: Number(e.target.value) })}
                />
              </div>

              <hr />

              <div className="style-group">
                <label>Radio puntos</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={st.radius}
                  onChange={(e) => onLocalChange(l.id, { radius: Number(e.target.value) })}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
