import 'dart:io';
import 'package:rive/rive.dart';

void main() async {
  final file = RiveFile.import(File('assets/zombie.riv').readAsBytesSync());
  print("Artboards: \${file.mainArtboard.name}");
  for (var sm in file.mainArtboard.stateMachines) {
    print("State Machine: \${sm.name}");
    for (var input in sm.inputs) {
        print(" - Input: \${input.name} (Type: \${input.coreType})");
    }
  }
}
