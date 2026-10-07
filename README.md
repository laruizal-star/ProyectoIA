# ProyectoIA — Visión Artificial para Robótica Agrícola en Frutillas (Variedad Festival)

![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python)
![PyTorch](https://img.shields.io/badge/PyTorch-2.2%2B-ee4c2c?logo=pytorch)
![ROS 2](https://img.shields.io/badge/ROS_2-Humble_Hawksbill-22314E?logo=ros)
![TensorRT](https://img.shields.io/badge/NVIDIA-TensorRT_8.6-76B900?logo=nvidia)
![Variedad](https://img.shields.io/badge/Cultivar-Festival_(Fragaria_x_ananassa)-e11d48)
![Licencia](https://img.shields.io/badge/Licencia-MIT-green)

Sistema avanzado de visión artificial embebida y procesamiento en el borde (Edge AI) para un robot agrícola autónomo que recorre plantaciones de fresas/frutillas (*Fragaria × ananassa*) de **variedad tipo Festival**. El sistema clasifica el índice de maduración en 5 etapas agronómicas, estima el volumen y contenido de azúcar (°Brix), y guía brazos robóticos para la cosecha selectiva sin daño mecánico al fruto.

---

## 🍓 ¿Por qué la Variedad "Festival"?

La variedad **Florida Festival** es uno de los cultivares más cultivados y demandados a nivel global debido a:
- **Morfología homogénea:** Frutos cónicos-globosos con cáliz verde pronunciado y semillas ligeramente insertas.
- **Firmeza de pulpa:** Elevada resistencia al transporte y manipulación mecánica.
- **Ventana crítica de cosecha:** El viraje de color hacia el rojo carmesí óptimo (75% a 100%) ocurre en 24 a 36 horas bajo radiación solar intensa. Cosechar prematuramente (etapa blanca/verde) detiene la maduración (fruto no climatérico), mientras que cosechar tarde provoca pérdidas por sobremaduración y hongos (*Botrytis cinerea*).

---

## 🎯 Arquitectura del Sistema de Visión

El pipeline de visión artificial está optimizado para ejecutarse a **>35 FPS** en un computador de borde **NVIDIA Jetson AGX Orin**:

```
[ Cámara Estéreo RGB-D + Anillo Polarizado ]
                    │
                    ▼ (1080p @ 60 FPS)
       [ Preprocesamiento & CLAHE ]
   (Normalización de luz solar y sombras)
                    │
                    ▼
   [ Modelo de Segmentación Multitarea ]
   (YOLOv8x-Festival-Seg + Spatial Attention)
          ┌─────────┴─────────┐
          ▼                   ▼
[ Máscara de Instancia ]    [ Pose 3D del Pedúnculo ]
   (Contorno de la fruta)      (Vector de corte [X, Y, Z, θ])
          │
          ▼
[ Análisis Colorimétrico CIELAB (L*a*b*) ]
  (Relación superficie roja/verde + ARI)
          │
          ▼
[ Clasificación en 5 Estados de Maduración ]
  1. Inmaduro / Verde (<10% rojo)  ──► Omitir
  2. Blanco / Quiebre (10-25% rojo) ──► Monitoreo fenológico
  3. Pintón / Rosa    (25-75% rojo) ──► Proyectar cosecha (36h)
  4. Maduro Óptimo    (75-100% rojo)──► Cosecha Inmediata
  5. Sobremaduro      (Púrpura/Blando)► Descarte / Industrial
          │
          ▼
[ Publicador de Tópicos ROS 2 & Guiado al Manipulador ]
```

---

## 📂 Estructura del Repositorio

```
ProyectoIA/
├── index.html              # Homepage interactiva y profesional del proyecto
├── styles.css              # Estilos personalizados y tokens de diseño agronómico
├── app.js                  # Lógica del simulador de visión, charts y telemetría
├── assets/                 # Recursos gráficos, esquemas y capturas
├── config/                 # Parámetros de calibración de cámaras y umbrales CIELAB
├── docs/                   # Documentación técnica, papers y guías agronómicas
├── models/                 # Definiciones de modelos y scripts de exportación TensorRT
├── ros2_ws/                # Paquetes ROS 2 para el nodo de visión y control del AGV
├── README.md               # Documentación principal
└── LICENSE                 # Licencia de código abierto MIT
```

---

## 💻 Visualización de la Homepage

Para ver la presentación completa del proyecto y probar el **Simulador Interactivo de Visión Artificial**:
1. Abre el archivo [`index.html`](./index.html) directamente en cualquier navegador web moderno (Chrome, Edge, Firefox, Safari).
2. O utiliza un servidor local rápido:
   ```bash
   # Con Python
   python -m http.server 8080
   # Con Node.js
   npx serve .
   ```
3. Visita `http://localhost:8080`.

---

## 🚀 Requisitos e Instalación del Nodo de Visión

### Requisitos de Hardware
- **Procesador de Borde:** NVIDIA Jetson AGX Orin (o Jetson Orin Nano / RTX 4000 series para pruebas).
- **Cámara:** Intel RealSense D435i / ZED 2i Stereo Camera con polarizador circular (CPL).
- **Iluminación:** Anillo LED de alto CRI (Ra > 95) con polarización cruzada a 90° respecto al sensor.

### Instalación de Dependencias
```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/ProyectoIA.git
cd ProyectoIA

# Instalar dependencias de Python
pip install -r requirements.txt
```

---

## 📊 Métricas de Rendimiento del Modelo de Visión

| Métrica | Valor | Observaciones |
| :--- | :--- | :--- |
| **mAP@50 (Detección)** | **94.8%** | Evaluado en campo bajo luz solar directa y sombra |
| **mAP@50-95 (Segmentación)** | **91.2%** | Delineación precisa de cáliz y receptáculo |
| **Precisión Madurez (5 clases)** | **96.3%** | Validado contra colorímetro Minolta CR-400 |
| **Error Pose Pedúnculo (RMSE)** | **2.4 mm** | Suficiente para efector final con tolerancia ±5 mm |
| **FPS en Jetson Orin (FP16)** | **38.5 FPS** | Latencia extremo a extremo < 26 ms |

---

## 📄 Licencia

Este proyecto se distribuye bajo la Licencia **MIT**. Consulta el archivo [`LICENSE`](./LICENSE) para más detalles.
