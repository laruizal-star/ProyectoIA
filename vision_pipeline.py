"""
ProyectoIA - Pipeline de Visión Artificial para Frutillas Festival
Módulo central de clasificación fenológica no invasiva y estimación de pose 3D.
Cultivar: Fragaria x ananassa 'Festival'
"""

import cv2
import numpy as np
from dataclasses import dataclass
from typing import List, Tuple, Dict, Optional

@dataclass
class FestivalMaturityProfile:
    stage_id: int
    stage_name: str
    red_coverage_pct: float
    estimated_brix: float
    estimated_firmness_kg_cm2: float
    harvest_recommendation: str
    peduncle_cut_offset_mm: float

class FestivalVisionProcessor:
    """
    Procesador de visión artificial adaptado a las características biométricas
    y colorimétricas de la frutilla variedad 'Florida Festival'.
    """

    # Definición de las 5 etapas agronómicas para Festival
    STAGES = {
        1: ("Inmaduro / Verde", "<10% rojo", "OMITIR / REPOSO", 12.0),
        2: ("Blanco / Quiebre", "10-25% rojo", "MONITOREO (+72h)", 13.0),
        3: ("Pintón / Transición", "25-75% rojo", "PLANIFICAR (+36h)", 15.0),
        4: ("Maduro Comercial Óptimo", "75-100% rojo", "COSECHAR INMEDIATAMENTE", 14.0),
        5: ("Sobremaduro / Senescente", "Rojo oscuro/púrpura", "DESCARTE / INDUSTRIA", 15.0)
    }

    def __init__(self, use_clahe: bool = True):
        self.use_clahe = use_clahe
        if self.use_clahe:
            # CLAHE adaptativo para compensar sombras de hojas
            self.clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))

    def preprocess_image(self, bgr_image: np.ndarray) -> np.ndarray:
        """Aplica normalización lumínica y reducción de brillos especulares."""
        if not self.use_clahe:
            return bgr_image

        lab = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        l_clahe = self.clahe.apply(l)
        lab_clahe = cv2.merge((l_clahe, a, b))
        return cv2.cvtColor(lab_clahe, cv2.COLOR_LAB2BGR)

    def analyze_fruit_ripeness(self, fruit_crop_bgr: np.ndarray, mask: Optional[np.ndarray] = None) -> FestivalMaturityProfile:
        """
        Analiza el receptáculo de la fresa en espacio CIELAB para calcular
        el porcentaje de superficie roja y estimar los grados Brix.
        """
        if mask is None:
            # Máscara por umbral OTSU si no se provee máscara de segmentación YOLO
            gray = cv2.cvtColor(fruit_crop_bgr, cv2.COLOR_BGR2GRAY)
            _, mask = cv2.threshold(gray, 30, 255, cv2.THRESH_BINARY)

        lab = cv2.cvtColor(fruit_crop_bgr, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)

        # En CIELAB: el canal 'a' representa el eje Verde (-) a Rojo (+)
        # Para frutillas Festival, 'a' > 145 indica acumulación neta de antocianinas
        fruit_pixels = mask > 0
        total_fruit_pixels = np.count_nonzero(fruit_pixels)
        if total_fruit_pixels == 0:
            total_fruit_pixels = 1

        red_pixels = (a_channel > 145) & fruit_pixels
        red_count = np.count_nonzero(red_pixels)
        red_ratio = (red_count / total_fruit_pixels) * 100.0

        # Clasificación en 5 etapas
        if red_ratio < 10.0:
            stage = 1
            brix = 4.1 + (red_ratio / 10.0) * 0.8
            firmness = 3.5 - (red_ratio / 10.0) * 0.4
        elif red_ratio < 25.0:
            stage = 2
            brix = 5.0 + ((red_ratio - 10.0) / 15.0) * 0.9
            firmness = 3.0 - ((red_ratio - 10.0) / 15.0) * 0.4
        elif red_ratio < 75.0:
            stage = 3
            brix = 6.0 + ((red_ratio - 25.0) / 50.0) * 1.8
            firmness = 2.6 - ((red_ratio - 25.0) / 50.0) * 0.4
        elif red_ratio <= 95.0:
            stage = 4  # Óptimo Festival
            brix = 8.5 + ((red_ratio - 75.0) / 20.0) * 0.8
            firmness = 2.1 - ((red_ratio - 75.0) / 20.0) * 0.2
        else:
            stage = 5  # Sobremaduro
            brix = 9.3
            firmness = 1.2

        info = self.STAGES[stage]
        return FestivalMaturityProfile(
            stage_id=stage,
            stage_name=info[0],
            red_coverage_pct=round(red_ratio, 2),
            estimated_brix=round(brix, 2),
            estimated_firmness_kg_cm2=round(firmness, 2),
            harvest_recommendation=info[2],
            peduncle_cut_offset_mm=info[3]
        )

    def compute_3d_peduncle_pose(self, calyx_center_px: Tuple[int, int], depth_map: np.ndarray, camera_intrinsics: Dict) -> Dict[str, float]:
        """
        Calcula las coordenadas tridimensionales (X, Y, Z) del punto de corte
        del pedúnculo respecto al marco de referencia de la cámara del robot.
        """
        u, v = calyx_center_px
        z_depth = float(depth_map[v, u]) if (0 <= v < depth_map.shape[0] and 0 <= u < depth_map.shape[1]) else 0.25 # metros

        fx = camera_intrinsics.get('fx', 615.0)
        fy = camera_intrinsics.get('fy', 615.0)
        cx = camera_intrinsics.get('cx', 320.0)
        cy = camera_intrinsics.get('cy', 240.0)

        # Proyección inversa pinhole
        x_3d = (u - cx) * z_depth / fx
        y_3d = (v - cy) * z_depth / fy

        # Offset de seguridad para el corte sobre el cáliz (14 mm)
        offset_m = 0.014
        y_cut_3d = y_3d - offset_m

        return {
            'x_m': round(x_3d, 4),
            'y_m': round(y_cut_3d, 4),
            'z_m': round(z_depth, 4),
            'yaw_deg': -12.0
        }

if __name__ == "__main__":
    processor = FestivalVisionProcessor(use_clahe=True)
    # Demostración con imagen sintética de prueba
    test_crop = np.zeros((100, 80, 3), dtype=np.uint8)
    test_crop[:, :] = (30, 25, 200) # Simulación de color rojo carmesí
    profile = processor.analyze_fruit_ripeness(test_crop)
    print(f"--- Prueba de Clasificación de Madurez (Festival) ---")
    print(f"Etapa: {profile.stage_name} (ID: {profile.stage_id})")
    print(f"Cobertura Roja: {profile.red_coverage_pct}%")
    print(f"Brix Estimado: {profile.estimated_brix} °Bx")
    print(f"Firmeza Estimada: {profile.estimated_firmness_kg_cm2} kg/cm²")
    print(f"Recomendación Robot: {profile.harvest_recommendation}")
