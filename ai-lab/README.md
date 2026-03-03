# Block C AI Labs — 3D Interactive Mockup

This is a lightweight Three.js mockup based on your provided floor layout image.

## Included

- 3D room shell representing ~345m² footprint (23m x 15m)
- Three labeled zones (`AI LAB 1`, `AI LAB 2`, `AI LAB 3`)
- Internal movable partitions to reflect:
  - **Option 1**: 1 big room + 2 small rooms
  - **Open Studio**: merged space
- Approximate sockets/data points, doors, and projector/podium location
- Orbit controls for navigation

## Run

Because this uses ES modules, run from a local server:

```bash
cd /Users/tansk/SengKwang/Coding/ai-lab
python3 -m http.server 8080
```

Open:

- http://localhost:8080

## Notes

- Geometry is a conceptual mockup (not exact CAD/BIM dimensions).
- If you want, I can next add more accurate furniture placement and room measurements from a dimensioned drawing.
