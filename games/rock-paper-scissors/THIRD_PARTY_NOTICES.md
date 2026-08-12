# Third-party notices

## qrcode-generator 2.0.4

Copyright (c) 2009 Kazuhiko Arase. Licensed under the MIT License. The vendored
module retains its original license header.

## qr-scanner 1.4.2

Copyright (c) 2017 Nimiq, Daniel Molitor. Licensed under the MIT License. A copy
of its license is available at [`vendor/qr-scanner-LICENSE`](./vendor/qr-scanner-LICENSE).

## Third-party TURN fallbacks

WebRTC ICE includes third-party TURN endpoints as fallback relays for restrictive
networks. Relay usage is limited to connectivity fallback; the DataChannel
remains DTLS-encrypted by WebRTC. Public demo credentials may expire or be
rate-limited. For production deployment, replace them with time-limited
credentials from a TURN provider you control.
