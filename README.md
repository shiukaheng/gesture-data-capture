# Low Cost Hand Gesture Recognition Using Optimized IMU Placements
## Abstract
Current production hand gesture recognition methods require high manufacturing cost and computational cost: image based pose recognition needs a lot of computational power from computer vision, 26DoF IMU hand tracking gloves requires a lot of hardware and is tedious to set up. We propose a new method of gesture recognition based upon IMU hand tracking, but with a reduced amount of IMUs and an optimum placement such that we can reduce the number of IMUs but still achieve similar performance in detecting the most common gestures.
## Todo
- [x] Web data collection utility
- [ ] Collecting data
- [ ] Exploring machine learning models and data representation
- [ ] Writing the paper
## Web data collection utility
We've created a web utility for collecting labelled hand skeleton data using the WebXR hand tracking API, the code of which is supplied within this repository. The web server could be launched as below:
```
> cd server
> pdm install
> pdm run python ./app.py
```


https://user-images.githubusercontent.com/31088159/142601819-60347d97-fa88-414b-a170-c36485725f8a.mov


