---
title = LightDB

[artifact.1]
kind = demo
label = Demo
url = https://sholtomaud.github.io/lightdb

[artifact.2]
kind = repo
label = Repo
url = https://github.com/sholtomaud/lightdb
---
A local database that syncs between devices over light. One screen displays an animated QR stream, the other reads it with a camera. No internet, no Bluetooth, no pairing, no radio of any kind.

How a sync goes:

* Pass 1 — this device shows its changes. The other scans them.
* Flip — turn the devices around.
* Pass 2 — the other replies with what you are missing.

Both replicas have converged. Records merge conflict-free, so it does not matter which side goes first or whether a pass is repeated.