# Graph Digitizer

A React Native graph digitization tool for extracting numerical data from chart images.

## Overview

Graph Digitizer allows users to load a chart image, calibrate the graph axes, digitize data points, and export the resulting data as CSV.

The application is designed for extracting numerical data from graphs when the original data is unavailable.

## Features

### Calibration

* One-point and two-point axis calibration
* Linear and logarithmic axes
* Draggable calibration handles
* Live calibration guides

### Digitizing

* Multiple datasets
* Real-time spline curves
* Point nudging
* Dataset translation
* Undo/redo

### Analysis

* Linear regression
* Interpolation

### Projects

* Save/load projects
* CSV export

## Technology

* React Native
* Expo
* React Native SVG
* React Native Reanimated
* AsyncStorage


## Screenshots

### Spline Interpolation

Visualize interpolated curves and manage multiple datasets.

<p align="center">
  <img src="screenshots/demo.gif" width="350">
</p>

### Data Fitting

Digitize points and perform curve fitting.

<p align="center">
  <img src="screenshots/data-fit.png" width="350">
</p>

### Calibration

Define graph axes and reference points for coordinate conversion.

<p align="center">
  <img src="screenshots/calibration.png" width="350">
</p>

### Analysis

Best-fit curve with equation and statistics.

<p align="center">
  <img src="screenshots/analysis.png" width="350">
</p>

## Status

Version 0.2.1

## License

Not currently licensed for redistribution.
