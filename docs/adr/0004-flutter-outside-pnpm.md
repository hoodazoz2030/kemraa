# ADR-0004: Flutter Apps Outside pnpm

Status: Accepted | 2026-08-11

Decision: Flutter apps manage Dart deps via pubspec.yaml independently. Turborepo invokes flutter tasks; pnpm never manages Dart packages.