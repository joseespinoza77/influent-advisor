# Teoría de la Aplicación: Influent Advisor — Caracterización de Influentes para Modelos ASM (Activated Sludge Models)

## 1. Introducción y Propósito

**Influent Advisor** es una herramienta de caracterización de aguas residuales (influente) diseñada para convertir parámetros de laboratorio convencionales en **variables de estado** específicas de modelo, compatibles con simuladores de procesos de fangos activados como **GPS-X**, **SIMBA**, **ASIM** o **WEST**.

El propósito fundamental es aplicar los principios de **fraccionamiento de DQO (COD fractionation)** y **especiación de nitrógeno** establecidos por los modelos ASM1, ASM2d, ASM3, Mantis y Reduced de la familia **Activated Sludge Models (IWA)** .

---

## 2. Marco Teórico: Modelos de Fangos Activados (ASM)

### 2.1 Antecedentes

Los modelos ASM fueron desarrollados por la **International Water Association (IWA)** Task Group on Mathematical Modelling for Design and Operation of Biological Wastewater Treatment. El primer modelo (ASM1) se publicó en 1987 y revolucionó el diseño de EDAR al introducir un marco mecanicista para la eliminación de carbono y nitrógeno.

### 2.2 Principios Fundamentales del Modelado ASM

Los modelos ASM utilizan **DQO (Chemical Oxygen Demand)** como parámetro principal para los constituyentes carbonosos en lugar de DBO, porque la DQO permite un **balance de masa completo** que contabiliza la utilización de sustrato, el crecimiento de biomasa y el consumo de oxígeno. La DBO no permite este cierre de balance debido a que no toda la materia orgánica biodegradable se oxida en 5 días.

La estructura teórica de los modelos ASM se basa en:

1. **Matriz de Petersen (Stoichiometric Matrix)** : Relaciona sistemáticamente los procesos biológicos (reacciones) con las variables de estado (componentes). Combinando el vector de variables de estado con el vector de velocidades de reacción, se calcula cómo cada variable cambia en el tiempo.
2. **Cinética de Monod**: El crecimiento de biomasa sigue la cinética de Monod: `μ = μ_max × S / (K_s + S)`, donde la velocidad de crecimiento depende de la concentración del sustrato limitante.
3. **Balance de DQO**: Se usa DQO como unidad común tanto para sustrato orgánico como para biomasa, asegurando un balance de masa cerrado para utilización de sustrato, crecimiento celular y consumo de oxígeno.
4. **Concepto Lisis-Rebrote (Lysis-Regrowth)** : Cuando las células bacterianas mueren, sufren lisis y liberan material particulado. Una parte es **residuo celular inerte (Xi)** y otra es **sustrato particulado lentamente biodegradable (Xs)** que debe hidrolizarse nuevamente antes de ser reutilizado.

### 2.3 Nomenclatura de Componentes

El marco teórico clasifica los constituyentes del agua residual según su **estado físico**:

| Prefijo | Significado | Ejemplo |
|---------|-------------|---------|
| **S** | Soluble (disuelto) | Ss, Si, Snh |
| **C** | Coloidal | — |
| **X** | Particulado | Xi, Xs, Xbh |
| **T** | Total (S + C + X) | TCOD, TKN |

### 2.4 Modelos Soportados en Influent Advisor

| Modelo | Descripción | Variables de Estado | Procesos | Biblioteca |
|--------|-------------|-------------------|----------|------------|
| **ASM1** | Modelo original de lodos activados (1987) — eliminación de C y N | 13 componentes | 8 procesos | CN |
| **ASM2d** | Extensión de ASM2 con eliminación biológica de P (1995) | 18 componentes | 21 procesos | CNP |
| **ASM3** | Modelo revisado con metabolismo interno y almacenamiento (1999) | 13 componentes | 12 procesos | CN / CNP |
| **Mantis** | Modelo propietario de Hydromantis (GPS-X) | ~17 componentes | — | CN / CNP |
| **Reduced** | Modelo simplificado de 7 componentes | 7 componentes | — | CN |
| **NG (New General)** | Modelo generalizado de Hydromantis | ~21 componentes | — | CNP |

### 2.5 Bibliotecas

| Biblioteca | Componentes adicionales | Uso |
|------------|------------------------|-----|
| **CN** (Carbon/Nitrogen) | Solo variables de C y N | Modelos ASM1, ASM3, Mantis, Reduced |
| **CNP** (Carbon/Nitrogen/Phosphorus) | Variables de C, N y P | Modelos ASM2d, ASM3-CNP, Mantis-CNP, NG |

La diferencia clave entre CN y CNP es que CNP añade:

- **Xbp** / **Xpao** (phosphorus-accumulating organisms, PAOs)
- **Xbt** (polyphosphate)
- **Spo4** (soluble phosphate)
- **Xpp** (stored polyphosphate)
- **Xpha** (stored PHA)

Esto desplaza las filas de variables 3 posiciones hacia abajo en las hojas CNP (de ahí el offset `N=0` para CN, `N=3` para Reduced que es CN).

---

## 3. Estructura del Libro de Cálculo

### 3.1 Las 36 Hojas de Cálculo

Cada hoja representa una combinación de **modelo × vista × biblioteca**:

| Vista | Modelos (CN) | Modelos (CNP) |
|-------|-------------|---------------|
| **States** | ASM1-Mantis, Mantis, ASM3, Reduced | ASM1-Mantis, Mantis, ASM3, ASM2d, NG |
| **BODbased** | ASM1-Mantis, Mantis, ASM3, Reduced | ASM1-Mantis, Mantis, ASM3, ASM2d, NG |
| **TSSCOD** | ASM1-Mantis, Mantis, ASM3, Reduced | ASM1-Mantis, Mantis, ASM3, ASM2d, NG |
| **CODfr** | ASM1-Mantis, Mantis, ASM3, Reduced | ASM1-Mantis, Mantis, ASM3, ASM2d, NG |

### 3.2 Las 4 Vistas (Influent Models)

Cada vista representa un método diferente de especificar los datos de entrada:

1. **States** — Entrada directa de variables de estado (fracciones DQO, especies de N)
2. **BODbased** — Entrada basada en DBO5/DQO/TKN (método clásico de diseño)
3. **TSSCOD** — Entrada basada en SST/DQO
4. **CODfr** — Entrada basada en fracciones de DQO directamente

### 3.3 Las 3 Secciones Horizontales por Hoja

Cada hoja se divide en 3 secciones:

```
Columnas:   B    C    D    E  |  G    H    I    J  |  M    N    O    P
                              |                     |
   [Name]  [Desc]  [Unit] [Value] |  [StVar] [Formula] [Unit] [Calc] | [Comp]  [Formula] [Unit] [Calc]
                                                                    
         ^--- USER INPUTS ---^        ^-- STATE VARIABLES --^           ^-- COMPOSITE VARIABLES --^
         (col E: editable)            (col J: calculated)               (col P: calculated)
```

#### Sección 1: User Inputs (Columnas B:E, filas 8-33)

- **B**: Nombre del parámetro (ej. "si", "ss", "xi")
- **C**: Descripción (ej. "soluble inert organic material")
- **D**: Unidad (ej. "gCOD/m³")
- **E**: Valor editable por el usuario (valor por defecto + campo de entrada)

#### Sección 2: State Variables (Columnas G:J, filas 8-24)

- **G**: Nombre de la variable de estado
- **H**: Fórmula fuente (siempre `=H3` en el VBA, indicando que la fórmula se obtiene de la celda H3)
- **I**: Unidad
- **J**: Valor calculado (resultado de la fórmula)

#### Sección 3: Composite Variables (Columnas M:P, filas 8-23)

- **M**: Nombre de la variable compuesta
- **N**: Fórmula fuente (también `=H3`)
- **O**: Unidad
- **P**: Valor calculado

---

## 4. Fraccionamiento de la DQO (COD Fractionation)

### 4.1 Principio Fundamental

La **Demanda Química de Oxígeno (DQO)** total de un agua residual se fracciona en componentes con diferentes velocidades de biodegradación y diferentes comportamientos en el proceso de fangos activados. La DQO es el parámetro preferido sobre la DBO porque permite cerrar el balance de masa — todo el sustrato consumido, la biomasa generada y el oxígeno consumido están contabilizados en las mismas unidades (gCOD/m³).

La DQO total se define teóricamente como:

```
TCOD = rbCOD + sbCOD + nbsCOD + nbpCOD
```

Que en notación ASM equivale a:

```
COD_total = Ss + Xs + Si + Xi
```

### 4.2 Las Cuatro Grandes Fracciones de DQO

| Fracción | Símbolo ASM | Nombre | Descripción | Ruta en el proceso |
|----------|-------------|--------|-------------|-------------------|
| **rbCOD** | **Ss** | Readily Biodegradable | Sustrato soluble fácilmente biodegradable (ácidos grasos volátiles, DQO soluble compleja) | Asimilado rápidamente por biomasa heterótrofa. Dicta la demanda inicial de oxígeno en tanques de aireación y la velocidad de desnitrificación en zonas anóxicas. |
| **sbCOD** | **Xs** | Slowly Biodegradable | DQO biodegradable particulada y colonial. Debe ser hidrolizada por enzimas extracelulares antes de ser asimilada. | Requiere hidrólisis → libera rbCOD → consumido por biomasa. Es el paso limitante en la velocidad de degradación. |
| **nbsCOD** | **Si** | Nonbiodegradable Soluble | Material orgánico disuelto que no puede degradarse biológicamente. | Pasa a través del tratamiento sin reacción. Dicta la concentración de DQO de fondo en el efluente secundario. |
| **nbpCOD** | **Xi** | Nonbiodegradable Particulate | Materia orgánica particulada que resiste la biodegradación. | Queda atrapada en el flóculo del fango activado y contribuye a la producción total de lodo (medida como nbVSS). |

### 4.3 Fraccionamiento Detallado: El Nivel ASM

Los modelos ASM refinan aún más el fraccionamiento, subdividiendo la fracción biodegradable particulada y añadiendo la biomasa activa y el residuo endógeno como componentes explícitos:

| Símbolo | Nombre | Descripción | Biodegradabilidad | Unidad |
|---------|--------|-------------|-------------------|--------|
| **Si** | Soluble Inert | Material orgánico soluble no biodegradable (nbsCOD) | Inerte | gCOD/m³ |
| **Ss** | Readily Biodegradable | Sustrato soluble fácilmente biodegradable (rbCOD) | Fácil | gCOD/m³ |
| **Xi** | Particulate Inert | Material orgánico particulado inerte (nbpCOD) | Inerte | gCOD/m³ |
| **Xs** | Slowly Biodegradable | Sustrato particulado lentamente biodegradable (sbCOD) | Lenta | gCOD/m³ |
| **Xbh** | Heterotrophic Biomass | Biomasa heterótrofa activa presente en el influente | Activa | gCOD/m³ |
| **Xba** | Autotrophic Biomass | Biomasa autótrofa (nitrificante) activa presente en el influente | Activa | gCOD/m³ |
| **Xu** | Endogenous Residue | Residuo endógeno de biomasa (material inerte de lisis celular) | Inerte | gCOD/m³ |
| **Xii** | Inert Inorganic ISS | Sólidos inorgánicos inertes en suspensión (no DQO) | Inerte | g/m³ |

### 4.4 Mecanismo de Hidrólisis de Xs

Los microorganismos no pueden asimilar Xs directamente. El mecanismo es:

1. **Hidrólisis enzimática**: Bacterias secretan enzimas extracelulares que rompen las partículas complejas en moléculas solubles simples.
2. **Asimilación**: Las moléculas solubles (ahora rbCOD/Ss) son transportadas al interior celular.
3. **Metabolismo**: El sustrato es utilizado para crecimiento y mantenimiento celular.

La velocidad de hidrólisis sigue típicamente una cinética de saturación tipo Monod o de primer orden, y es a menudo el **paso limitante** en la degradación de materia orgánica particulada.

### 4.5 Ecuaciones de Balance de DQO

La DQO total se descompone en:

```
COD_total = Si + Ss + Xi + Xs + Xbh + Xba + Xu
```

A nivel de variables compuestas:

| Variable Compuesta | Fórmula | Significado Físico |
|-------------------|---------|-------------------|
| **scod** (DQO soluble) | = sbodu + si | `P8 = P14 + J8` |
| **xcod** (DQO particulada) | = xbodu + xi + xu | `P9 = P15 + J10 + J14` |
| **cod** (DQO total) | = scod + xcod | `P10 = P8 + P9` |
| **sbod** (DBO soluble) | = fbod × sbodu | `P11 = E30 × P14` |
| **xbod** (DBO particulada) | = fbod × xbodu | `P12 = E30 × P15` |
| **bod** (DBO5 total) | = sbod + xbod | `P13 = P11 + P12` |
| **sbodu** (DBO última soluble) | = Ss (readily biodegradable) | `P14 = J9` |
| **xbodu** (DBO última particulada) | = Xs (slowly biodegradable) | `P15 = J11` |
| **bodu** (DBO última total) | = sbodu + xbodu | `P16 = P14 + P15` |

**Donde:**

- `fbod` (E30) = relación DBO5/DBOúltima (típicamente 0.66)
- `icv` (E29) = relación DQO/VSS (típicamente 2.2 gCOD/gVSS)

---

## 5. Especiación del Nitrógeno

### 5.1 Química del Nitrógeno en Aguas Residuales

El nitrógeno en aguas residuales presenta múltiples estados de oxidación, lo que hace su química compleja. Las relaciones fundamentales son:

```
Nitrógeno Total (TN) = Nitrógeno orgánico + NH₄⁺ + NO₂⁻ + NO₃⁻
Nitrógeno Kjeldahl Total (TKN) = Nitrógeno orgánico + NH₄⁺ (NO₂⁻ NO₃⁻ excluidos)
```

En aguas residuales municipales típicas, entre el **60% y 70% del TKN** está en forma de amoniaco (NH₄⁺-N), que está fácilmente disponible para síntesis bacteriana y nitrificación.

El nitrógeno orgánico se subdivide a su vez en:
- **Forma soluble** (Snd): Nitrógeno orgánico disuelto biodegradable
- **Forma particulada** (Xnd): Nitrógeno orgánico particulado biodegradable

Cada una de estas fracciones se subdivide en porciones **biodegradables** y **no biodegradables**. La fracción particulada biodegradable (Xnd) requiere una **reacción de hidrólisis** para ser convertida a formas solubles, y por lo tanto se elimina más lentamente que las formas solubles.

### 5.2 Componentes de Nitrógeno en Influent Advisor

| Símbolo | Nombre | Descripción | Unidad |
|---------|--------|-------------|--------|
| **Snh** | Ammonia | Nitrógeno amoniacal (NH₄⁺-N). Principal forma de N en influente. | gN/m³ |
| **Snd** | Soluble Organic N | Nitrógeno orgánico soluble biodegradable | gN/m³ |
| **Xnd** | Particulate Organic N | Nitrógeno orgánico particulado biodegradable (requiere hidrólisis) | gN/m³ |
| **Sno** | Nitrate/Nitrite | Nitrógeno nítrico/nitroso (NO₃⁻-N + NO₂⁻-N). Típicamente bajo en influente. | gN/m³ |
| **Snn** | Dinitrogen | Nitrógeno gas (N₂), producido en desnitrificación | gN/m³ |
| **Salk** | Alkalinity | Alcalinidad (capacidad tampón, importante para nitrificación) | mol/m³ |

### 5.3 Ecuaciones de Balance de Nitrógeno

| Variable Compuesta | Fórmula | Significado |
|-------------------|---------|-------------|
| **stkn** | = snh + snd | Nitrógeno Kjeldahl soluble |
| **xtkn** | = xnd + ixbn*(xi+xs) + ixun*(xbh+xba+xu) | Nitrógeno Kjeldahl particulado |
| **tkn** | = stkn + xtkn | Nitrógeno Kjeldahl total |
| **tn** | = tkn + sno | Nitrógeno total (TKN + nitrato) |

**Donde:**

- `ixbn` (E32) = contenido de N en biomasa (0.086 gN/gCOD)
- `ixun` (E33) = contenido de N en residuo endógeno (0.06 gN/gCOD)

---

## 6. Sólidos y Variables Físicas

| Variable Compuesta | Fórmula | Significado |
|-------------------|---------|-------------|
| **xiss** | = xii | Sólidos inorgánicos en suspensión (ISS) |
| **vss** | = (xi + xs + xbh + xba + xu) / icv | Sólidos volátiles en suspensión (VSS) |
| **x (TSS)** | = xiss + vss | Sólidos totales en suspensión (TSS) |

**Donde:**

- `icv` (E29) = factor de conversión DQO/VSS (gCOD/gVSS), típicamente 2.2

---

## 7. Modelos Específicos: Diferencias Clave

### 7.1 ASM1 (1987)

ASM1 fue el primer modelo integral de la IWA y sentó las bases para todos los modelos posteriores:

- **Propósito**: Eliminación biológica de Carbono (C) y Nitrógeno (N)
- **Componentes**: 13 variables de estado (Si, Ss, Xi, Xs, Xbh, Xba, Xp — no se usa en Influent Advisor — , So, Sno, Snh, Snd, Xnd, Salk)
- **Procesos**: 8 procesos (crecimiento aeróbico heterótrofo, crecimiento anóxico heterótrofo, crecimiento aeróbico autótrofo, decaimiento heterótrofo, decaimiento autótrofo, hidrólisis de Xs, hidrólisis de Xnd, amonificación de Snd)
- **Cinética**: Crecimiento con Monod, hidrólisis con cinética de saturación
- **Limitación**: No modela eliminación de fósforo

### 7.2 ASM2d (1995)

ASM2d extiende ASM2 para incluir eliminación biológica de fósforo y desnitrificación por PAOs:

- **Propósito**: Eliminación de C, N y P
- **Componentes**: 18 variables de estado
- **Procesos**: 21 procesos
- **Nuevos componentes**:
  - **Xpao** (Phosphorus-Accumulating Organisms)
  - **Xpp** (stored poly-phosphate)
  - **Xpha** (stored PHA — poly-hydroxy-alkanoates)
  - **Spo4** (soluble phosphate)
- **Innovación**: PAOs pueden desnitrificar (de ahí la "d" en ASM2d)
- En el VBA, `xbp` y `xbt` aparecen solo en ASM2d

### 7.3 ASM3 (1999)

ASM3 fue una revisión fundamental que corrige deficiencias de ASM1:

- **Propósito**: Eliminación de C y N (mejorado)
- **Componentes**: 13 variables de estado
- **Procesos**: 12 procesos
- **Cambio fundamental**: Sustituye el concepto de "decaimiento" de ASM1 por **respiración endógena** (aeróbica y anóxica). Las bacterias no "mueren y se lisan" sino que consumen sus propias reservas cuando no hay sustrato externo.
- **Nuevo componente**: **Xsto** (almacenamiento intracelular de polímeros). En lugar de que Ss se convierta directamente en biomasa, primero se almacena como Xsto y luego se utiliza para crecimiento.
- ASM3 requiere menos parámetros estequiométricos que ASM1

### 7.4 Modelo Mantis (Hydromantis / GPS-X)

Mantis es un modelo propietario desarrollado por Hydromantis para GPS-X:

- Combina elementos de ASM1 y ASM2d
- ~17 variables de estado
- Existe en variantes CN y CNP
- En el VBA, Mantis comparte las mismas asignaciones de celdas que ASM1-Mantis en muchos casos

### 7.5 Modelo Reduced

El modelo Reduced es una simplificación con solo 7 variables de estado. En VBA se implementa con un offset `N = 3`, lo que significa que las filas están desplazadas:

| Variable | States (ASM1) | States (Reduced) |
|----------|--------------|------------------|
| si | J8 | J16 |
| ss | J9 | J17 |
| xi | J10 | J8 |
| xs | J11 | J9 |
| xbh | J12 | J10 |
| xba | J13 | J11 |
| xu | J14 | J12 |

El Reduced no incluye: so (oxígeno disuelto), snh, snd, xnd, sno, snn, salk, xii, xsto.

### 7.6 Modelo NG (New General)

NG es un modelo propietario de Hydromantis (GPS-X) que:

- Generaliza los conceptos de ASM para ser más flexible
- Tiene el mayor número de variables de estado (~21)
- Existe solo en la biblioteca CNP
- Incluye todas las variables de ASM2d más componentes adicionales

---

## 8. Puente entre Laboratorio y Simulación

### 8.1 De Parámetros Convencionales a Variables de Modelo

Los laboratorios de EDAR miden parámetros convencionales (DBO5, DQO, TKN, NH4, SST, SSV). Los modelos ASM requieren fracciones. Para cerrar esta brecha se utilizan **relaciones empíricas establecidas**:

| Relación | Valor Típico | Uso |
|----------|-------------|-----|
| **bCOD / BOD5** | ~1.69 | Estimar DQO biodegradable total a partir de DBO5 |
| **DQO total / DBO5** | ~2.0 - 3.5 | Caracterizar biodegradabilidad del agua residual |
| **DQO/VSS (icv)** | ~2.2 gCOD/gVSS | Convertir entre DQO particulada y sólidos volátiles |
| **rbCOD / DQO total** | ~10-20% | Fracción fácilmente biodegradable (influye en cinética) |
| **Si / DQO total** | ~5-10% | Fracción inerte soluble (determina DQO efluente) |
| **Xi / DQO total** | ~15-30% | Fracción inerte particulada (determina producción de lodo) |

### 8.2 Las 4 Vistas como Puentes

Cada vista en Influent Advisor representa una estrategia diferente para cruzar este puente:

1. **States**: El usuario ya conoce las fracciones → entrada directa de Si, Ss, Xi, Xs, etc.
2. **BODbased**: El usuario tiene DBO5, DQO, TKN → el sistema estima las fracciones usando relaciones como bCOD/BOD5=1.69 y fbod=0.66
3. **TSSCOD**: El usuario tiene DQO total y SST → usa icv y fbod para estimar fracciones
4. **CODfr**: El usuario conoce proporciones (Si/COD, Ss/COD, etc.) → especificación directa de ratios

### 8.3 Flujo Completo de Datos

```
LABORATORIO:
  DBO5, DQO, TKN, NH4, SST, SSV
        │
        ▼
  RELACIONES EMPÍRICAS (vistas):
  • bCOD/BOD5 ≈ 1.69
  • fbod (DBO5/DBOúltima) ≈ 0.66
  • icv (DQO/VSS) ≈ 2.2
  • Fracciones específicas de DQO
        │
        ▼
  INFLUENT ADVISOR:
  User Inputs (col E) → State Variables (col J) → Composite Variables (col P)
        │
        ▼
  SIMULADOR (GPS-X, SIMBA, ASIM, WEST):
  Variables de estado ASM para simulación dinámica
```

---

## 9. Mecanismo de Funcionamiento del VBA

### 9.1 Arquitectura de Dispatcher

El VBA sigue un patrón **Dispatcher**: cada variable tiene su propia subrutina (ej. `si()`, `ss()`, `cod()`, `bod()`) que contiene un `Select Case` sobre el nombre de la hoja activa y redirige a la rutina `ResetCells` correspondiente.

```vb
Sub si()
    Select Case WSName
        Case Is = "States (ASM1-Mantis)"
            cel = "J8"      ' ← Target cell for Si in this sheet
            Formula = "H3"  ' ← Formula always read from H3
            States_ASM1_Mantis_ResetCells
            N = 0
        Case Is = "States (Reduced)"
            cel = "J16"     ' ← Different target for Reduced model
            Formula = "H3"
            States_Reduced_ResetCells
            N = 3
    End Select
End Sub
```

### 9.2 Asignación de Celdas por Variable y Modelo

| Variable | ASM1-Mantis | Mantis | ASM3 | Reduced | ASM2d (CNP) | NG (CNP) |
|----------|-------------|--------|------|---------|-------------|----------|
| **si** | J8 | J8 | J8 | J16 | J8 | J8 |
| **ss** | J9 | J9 | J9 | J17 | J9 | J9 |
| **xi** | J10 | J10 | J10 | J8 | J10 | J10 |
| **xs** | J11 | J11 | J11 | J9 | J11 | J11 |
| **xbh** | J12 | J12 | J12 | J10 | J12 | J12 |
| **xba** | J13 | J13 | J13 | J11 | J13 | J13 |
| **xu** | J14 | J14 | J14 | J12 | J14 | J14 |
| **so** | J15 | J15 | J15 | — | J15 | J15 |
| **snh** | J16 | J16 | J16 | — | J17 (CNP) | J17 |
| **snd** | J17 | J17 | J17 | — | J18 | J18 |
| **xnd** | J18 | J18 | J18 | — | J19 | J19 |
| **sno** | J19 | J19 | J19 | — | J20 | J20 |
| **snn** | J20 | J20 | — | — | J21 | J21 |
| **salk** | J21 | J21 | J21 | — | J22 | J22 |
| **xii** | J22 | J22 | J22 | — | J23 | J23 |
| **cod** | P10 | P10 | P10 | P10 | P10 | P10 |
| **bod** | P13 | P13 | P13 | P13 | P13 | P13 |
| **tn** | P20 | P20 | P20 | P20 | P20 | P20 |
| **vss** | P22 | P22 | P22 | P22 | P25 (CNP) | P25 |

### 9.3 La Importancia de la Celda H3

Todas las subrutinas de variables usan `Formula = "H3"`. La celda **H3** contiene la fórmula real que se insertará en la celda objetivo. Esto significa:

- H3 es la **fuente única de verdad** para la fórmula de cada variable
- Las rutinas `ResetCells` gestionan el formateo (color, fuente) pero no la fórmula en sí
- El valor de N (offset) determina cómo se reindexan las filas entre modelos

---

## 10. Flujo de Datos: De Laboratorio a Simulación

### 10.1 Cadena de Transformación

```
Datos de Laboratorio → User Inputs (col E) → State Variables (col J) → Composite Variables (col P) → GPS-X
```

### 10.2 Ejemplo Numérico (States ASM1-Mantis)

**Paso 1: User Inputs** (valores típicos de agua residual municipal)

| Parámetro | Valor | Unidad |
|-----------|-------|--------|
| xii (ISS) | 30 | g/m³ |
| si | 30 | gCOD/m³ |
| ss | 40 | gCOD/m³ |
| xi | 130 | gCOD/m³ |
| xs | 100 | gCOD/m³ |
| xbh | 0 | gCOD/m³ |
| xba | 0 | gCOD/m³ |
| xu | 0 | gCOD/m³ |
| so | 0 | gO₂/m³ |
| snh | 25 | gN/m³ |
| snd | 2 | gN/m³ |
| xnd | 2 | gN/m³ |
| sno | 0 | gN/m³ |
| snn | 0 | gN/m³ |
| salk | 7 | mol/m³ |
| icv | 2.2 | gCOD/gVSS |
| fbod | 0.66 | — |
| ixbn | 0.086 | gN/gCOD |
| ixun | 0.06 | gN/gCOD |

Nota: En este ejemplo, xbh, xba y xu se fijan en 0 porque el influente municipal típico no contiene biomasa activa significativa. Toda la biomasa en el sistema se genera a partir del crecimiento sobre Ss y Xs.

**Paso 2: State Variables** (mayoría son passthrough directos desde User Inputs)

| Variable | Fórmula | Resultado |
|----------|---------|-----------|
| J8 (si) | =E11 | 30 |
| J9 (ss) | =E12 | 40 |
| J10 (xi) | =E13 | 130 |
| J11 (xs) | =E14 | 100 |
| J12 (xbh) | =E15 | 0 |
| J13 (xba) | =E16 | 0 |
| J14 (xu) | =E17 | 0 |
| J15 (so) | =E19 | 0 |
| J16 (snh) | =E21 | 25 |
| J17 (snd) | =E22 | 2 |
| J18 (xnd) | =E23 | 2 |
| J19 (sno) | =E24 | 0 |
| J20 (snn) | =E25 | 0 |
| J21 (salk) | =E27 | 7 |
| J22 (xii) | =E9 | 30 |

**Paso 3: Composite Variables** (cálculos derivados)

| Variable | Fórmula | Cálculo | Resultado |
|----------|---------|---------|-----------|
| P8 (scod) | =P14+J8 | 40+30 | **70** |
| P9 (xcod) | =P15+J10+J14 | 100+130+0 | **230** |
| P10 (cod) | =P8+P9 | 70+230 | **300** |
| P11 (sbod) | =E30*P14 | 0.66×40 | **26.4** |
| P12 (xbod) | =E30*P15 | 0.66×100 | **66** |
| P13 (bod) | =P11+P12 | 26.4+66 | **92.4** |
| P14 (sbodu) | =J9 | 40 | **40** |
| P15 (xbodu) | =J11 | 100 | **100** |
| P16 (bodu) | =P14+P15 | 40+100 | **140** |
| P17 (stkn) | =J16+J17 | 25+2 | **27** |
| P18 (xtkn) | =J18+E32*(J10+J11+J12+J13+J14)+E33*(J12+J13+J14) | 2+0.086×(130+100+0+0+0)+0.06×(0+0+0) | **9.8** |
| P19 (tkn) | =P17+P18 | 27+9.8 | **36.8** |
| P20 (tn) | =P19+J19 | 36.8+0 | **36.8** |
| P21 (xiss) | =J22 | 30 | **30** |
| P22 (vss) | =(J10+J11+J12+J13+J14)/E29 | (130+100+0+0+0)/2.2 | **104.55** |
| P23 (x) | =P21+P22 | 30+104.55 | **134.55** |

### 10.3 Interpretación de Resultados

Para este agua residual municipal típica:

| Parámetro | Valor | Interpretación |
|-----------|-------|----------------|
| DQO total | 300 gCOD/m³ | Agua residual de carga media |
| DQO soluble | 70 gCOD/m³ | 23% del total |
| DQO particulada | 230 gCOD/m³ | 77% del total |
| DBO5 total | 92.4 g/m³ | Relación DQO/DBO5 = 3.2 (biodegradable) |
| TKN total | 36.8 gN/m³ | Típico para agua residual municipal |
| N-amoniacal | 25 gN/m³ | Principal forma de N (68% del TKN) |
| SST | 134.55 g/m³ | Sólidos en suspensión totales |
| SSV | 104.55 g/m³ | 78% de los SST son volátiles |

---

## 11. Las 4 Vistas en Detalle

### 11.1 States View

La vista **States** es la más completa. El usuario introduce directamente las fracciones de DQO y especies de nitrógeno. Es la vista recomendada cuando se dispone de datos detallados de caracterización.

**Inputs clave:** si, ss, xi, xs, xbh, xba, xu, snh, snd, xnd, sno, snn, salk, icv, fbod, ixbn, ixun

### 11.2 BODbased View

La vista **BODbased** está diseñada para cuando solo se dispone de datos clásicos de DBO5, DQO, TKN y SST.

**Inputs clave:** bod (DBO5), cod (DQO), tkn (TKN), tn (NT), xiss (ISS), icv, fbod

A partir de estos, el sistema **invierte** las ecuaciones de fraccionamiento para estimar las variables de estado. Utiliza la relación `bCOD ≈ 1.69 × BOD5` para estimar la DQO biodegradable total, y luego la descompone usando fbod y las fracciones típicas.

### 11.3 TSSCOD View

La vista **TSSCOD** usa datos de SST y DQO para estimar el fraccionamiento.

**Inputs clave:** cod (DQO), x (SST), icv, fbod, ixbn

### 11.4 CODfr View

La vista **CODfr** es la más detallada: el usuario especifica directamente las proporciones de cada fracción de DQO.

**Inputs clave:** si/cod, ss/cod, xi/cod, xs/cod, xbh/cod, xba/cod, snh, snd, xnd, sno

Tiene variables compuestas adicionales como `P27`, `P28`, `P40-P42` que representan fracciones normalizadas.

---

## 12. VBA ResetCells: Formateo Visual

Las subrutinas `ResetCells` no alteran los valores calculados, sino que gestionan el **formateo** de las celdas:

- **ColorIndex = 18** (azul claro): Celdas de entrada de usuario (columna E)
- **ColorIndex = 23** (lavanda): Celdas calculadas (columnas J y P)
- **Font.FontStyle = "regular"**: Restablece el estilo de fuente

Ejemplo de la estructura:

```vb
Sub States_ASM1_Mantis_ResetCells()
    ' Formatear entradas de usuario (azul)
    Worksheets("States (ASM1-Mantis)").Range("E9").Interior.ColorIndex = 18
    Worksheets("States (ASM1-Mantis)").Range("E11:E17").Interior.ColorIndex = 18
    Worksheets("States (ASM1-Mantis)").Range("E19").Interior.ColorIndex = 18
    ' ...
    
    ' Formatear variables de estado (lavanda)
    Worksheets("States (ASM1-Mantis)").Range("J8:J22").Interior.ColorIndex = 23
    
    ' Formatear variables compuestas (lavanda)
    Worksheets("States (ASM1-Mantis)").Range("P8:P23").Interior.ColorIndex = 23
End Sub
```

Los rangos de formateo varían entre modelos. Por ejemplo, el modelo Reduced tiene rangos más pequeños (`E11:E14` en lugar de `E11:E17`) porque tiene menos variables.

---

## 13. Referencias

### 13.1 Bibliografía Científica

1. **Henze, M., Gujer, W., Mino, T., & van Loosdrecht, M.C.M.** (2000). *Activated Sludge Models ASM1, ASM2, ASM2d and ASM3*. IWA Scientific and Technical Report No. 9. London: IWA Publishing.

2. **Metcalf & Eddy / Tchobanoglous, G., Stensel, H.D., Tsuchihashi, R., & Burton, F.** (2013). *Wastewater Engineering: Treatment and Resource Recovery* (5th ed.). McGraw-Hill.

3. **Gujer, W.** (2008). *Systems Analysis for Water Technology*. Springer.

4. **Hydromantis Inc.** *GPS-X Technical Reference Manual*. Modelos Mantis y New General (NG).

5. **Henze, M.** (1992). "Characterization of wastewater for modelling of activated sludge processes." *Water Science and Technology*, 25(6), 1-15.

6. **Roeleveld, P.J. & van Loosdrecht, M.C.M.** (2002). "Experience with guidelines for wastewater characterisation in the Netherlands." *Water Science and Technology*, 45(6), 77-87.

7. **Van Lier, J.B.** (2008). "Anaerobic Wastewater Treatment." Capítulo 16 en *Biological Wastewater Treatment: Principles, Modelling and Design*. IWA Publishing.

8. **Tejero, I. & Ninaki, C.** *Introducción a la Ingeniería Sanitaria y Ambiental*. (Texto universitario sobre caracterización de aguas residuales y diseño de EDAR.)

### 13.2 Software Relacionado

- **GPS-X** (Hydromantis Inc.): Simulador de procesos de tratamiento de aguas
- **SIMBA** (ifak): Simulador de sistemas de saneamiento
- **ASIM** (EAWAG): Activated Sludge SIMulation Program — permite editar matrices bio-cinéticas y ejecutar simulaciones dinámicas
- **WEST** (DHI): Simulador de tratamiento de aguas
- **AQUASIM** (EAWAG): Software de simulación y análisis de sistemas acuáticos

### 13.3 Fuentes Complementarias

El contenido de este documento se complementó con el análisis de las siguientes fuentes adicionales:

- Tejero & Ninaki — *Introducción a la Ingeniería Sanitaria y Ambiental*
- Metcalf & Eddy — *Wastewater Engineering* (5th ed.)
- Henze et al. — *Activated Sludge Models ASM1, ASM2, ASM2d and ASM3* (IWA Publishing)
- Van Lier — *Anaerobic Wastewater Treatment* (capítulo 16)
- Materiales de curso sobre diseño de EDAR: objetivos, pretratamiento, tratamiento primario, fangos activados, procesos de biopelícula
- Directiva 91/271/CEE y RD 1620/2007 (normativa española de reutilización)
- Presentación ACCIONA AGUA
- Documentación sobre modelado dinámico con matriz de Petersen y cinética de Monod

---

## 14. Glosario de Símbolos

| Símbolo | Significado | Unidad típica |
|---------|-------------|---------------|
| Si | Soluble inert organic matter (nbsCOD) | gCOD/m³ |
| Ss | Readily biodegradable substrate (rbCOD) | gCOD/m³ |
| Xi | Particulate inert organic matter (nbpCOD) | gCOD/m³ |
| Xs | Slowly biodegradable substrate (sbCOD) | gCOD/m³ |
| Xbh | Active heterotrophic biomass | gCOD/m³ |
| Xba | Active autotrophic biomass | gCOD/m³ |
| Xu | Endogenous (inert) biomass residue | gCOD/m³ |
| Xii | Inert inorganic suspended solids | g/m³ |
| Xsto | Cell internal storage product (ASM3) | gCOD/m³ |
| So | Dissolved oxygen | gO₂/m³ |
| Snh | Ammonium nitrogen (NH₄⁺-N) | gN/m³ |
| Snd | Soluble biodegradable organic nitrogen | gN/m³ |
| Xnd | Particulate biodegradable organic nitrogen | gN/m³ |
| Sno | Nitrate + nitrite nitrogen (NO₃⁻ + NO₂⁻) | gN/m³ |
| Snn | Dinitrogen gas (N₂) | gN/m³ |
| Salk | Alkalinity | mol/m³ |
| Xpao | Phosphorus-Accumulating Organisms (ASM2d) | gCOD/m³ |
| Xpp | Stored poly-phosphate (ASM2d) | gCOD/m³ |
| Xpha | Stored PHA (ASM2d) | gCOD/m³ |
| Spo4 | Soluble phosphate (ASM2d) | gP/m³ |
| rbCOD | Readily Biodegradable COD (= Ss) | gCOD/m³ |
| sbCOD | Slowly Biodegradable COD (= Xs) | gCOD/m³ |
| nbsCOD | Nonbiodegradable Soluble COD (= Si) | gCOD/m³ |
| nbpCOD | Nonbiodegradable Particulate COD (= Xi) | gCOD/m³ |
| bCOD | Biodegradable COD (rbCOD + sbCOD) | gCOD/m³ |
| COD/DQO | Chemical Oxygen Demand | gCOD/m³ |
| BOD/DBO | Biochemical Oxygen Demand (5-day) | g/m³ |
| BODu/DBOu | Ultimate Biochemical Oxygen Demand | g/m³ |
| TSS/SST | Total Suspended Solids | g/m³ |
| VSS/SSV | Volatile Suspended Solids | g/m³ |
| TKN | Total Kjeldahl Nitrogen | gN/m³ |
| TN/NT | Total Nitrogen | gN/m³ |
| ISS | Inorganic Suspended Solids | g/m³ |
| icv | COD/VSS ratio | gCOD/gVSS |
| fbod | BOD₅/Ultimate BOD ratio | — |
| ixbn | N content of biomass | gN/gCOD |
| ixun | N content of endogenous residue | gN/gCOD |
