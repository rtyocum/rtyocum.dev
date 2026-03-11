---
order: 1
title: Talos-RIT
organization: Rochester Institute of Technology
description: "Talos-RIT is a research project sponsored by the RIT Dept. of Software Engineering. The project seeks to repurpose the ScorBot ER-4pc and ER-V, both educational robotic arms, into a robotic autonomous cameraperson."
tags: ["Python", "OpenCV", "Tkinter", "C++", "C", "ESP-IDF", "Linux", "Hardware", "FreeRTOS", "ESP32", "I2C"]
github: "https://github.com/talos-rit"
---
# Talos-RIT
## About
Talos-RIT is a research project sponsored by the RIT Dept. of Software Engineering. The project seeks to repurpose the ScorBot ER-4pc and ER-V, both educational robotic arms, into a robotic autonomous cameraperson. Capturing high quality video in dynamic environments usually requires a human cameraperson to operate the camera. Talos-RIT aims to automate this process by using the arms to pan and tilt a camera to track a subject. This makes the end video more engaging and dynamic, while also reducing the need for a human cameraperson. 

This project is made of 3 distinct pieces. The python application is responsible for the computer vision and user interface. It uses OpenCV to process the video feed from the camera and track the subject. The application also provides a user interface built with Tkinter that allows users to configure the tracking settings and view the video feed. The second piece is the operator project on the ESP32. This is written in the Espressif Development Framework (ESP-IDF) and is responsible for receiving commands from the python application and controlling the motors of the robotic arm. The third piece is the hardware itself. We are developing a custom controller to restore the ER-4pc as the original controller is no longer available.

Here are the robots we are repurposing:
<figure id="talos-rit-img" class="image">
  <img src="/assets/img/projects/talos-rit.jpg" />
</figure>
