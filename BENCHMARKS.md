# Flow Injection — Benchmark Record

Do not publish placeholder or unverified numbers. Every row must be measured on
the named physical device and approved at Human Gate M2B.

## Method

1. Close unrelated GPU-heavy applications and cool the device to room temperature.
2. Use the production build and grant camera permission.
3. Select Ghost Current, leave flow settings at their documented defaults, and
   record both the initial result and a sustained result after five minutes.
4. Record browser version, display resolution, flow resolution, particle count,
   and whether timestamp queries are available.
5. Use the in-demo GPU timing readout. Do not substitute JavaScript frame time
   for individual GPU-stage timing.

## Results

| Device | OS | Browser | Particles | Flow resolution | Preprocess | Flow | Post | Advection | Draw | GPU total | Sustained FPS | Verified by |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| _desktop pending_ | | | | 160×90 | | | | | | | | |
| _phone pending_ | | | | 160×90 | | | | | | | | |

All stage times are milliseconds. If timestamp queries are unavailable, write
`n/a`; do not infer the values.

