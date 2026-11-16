#!/usr/bin/env bash
# Compilacao do Leonardo em Linux/macOS sem Arduino CLI.
# Requer avr-gcc 7.3 (ex.: apt install gcc-avr avr-libc binutils-avr) e usa o
# core de referencia em reference/ArduinoAVR-1.8.8 com as flags do platform.txt.
# EEPROM.h (biblioteca do core Arduino AVR) deve estar em EEPROM_DIR.
# No Windows, continue usando build-firmware.ps1.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
VERSION="${1:?uso: build-firmware.sh <versao>  ex.: 0.2.0}"
CORE="$ROOT/reference/ArduinoAVR-1.8.8"
EEPROM_DIR="${EEPROM_DIR:-$ROOT/tooling/libraries/EEPROM/src}"
OUT="$ROOT/build/leonardo-linux"
rm -rf "$OUT"; mkdir -p "$OUT/core" "$OUT/lib" "$OUT/sketch"

MCU=(-mmcu=atmega32u4 -DF_CPU=16000000L -DARDUINO=10607 -DARDUINO_AVR_LEONARDO -DARDUINO_ARCH_AVR
     -DUSB_VID=0x2341 -DUSB_PID=0x8036 '-DUSB_MANUFACTURER="Unknown"' '-DUSB_PRODUCT="Malth Pro"')
INC=(-I"$CORE/cores/arduino" -I"$CORE/variants/leonardo" -I"$ROOT/libraries/JoystickFFB/src"
     -I"$EEPROM_DIR" -I"$ROOT/Leonardo/MalthProLeonardo")
CFLAGS=(-c -g -Os -w -std=gnu11 -ffunction-sections -fdata-sections -flto -fno-fat-lto-objects)
CXXFLAGS=(-c -g -Os -w -std=gnu++11 -fpermissive -fno-exceptions -ffunction-sections -fdata-sections
          -fno-threadsafe-statics -Wno-error=narrowing -flto)
SFLAGS=(-c -g -x assembler-with-cpp -flto)

for f in "$CORE"/cores/arduino/*.c; do avr-gcc "${CFLAGS[@]}" "${MCU[@]}" "${INC[@]}" "$f" -o "$OUT/core/$(basename "$f").o"; done
for f in "$CORE"/cores/arduino/*.cpp; do avr-g++ "${CXXFLAGS[@]}" "${MCU[@]}" "${INC[@]}" "$f" -o "$OUT/core/$(basename "$f").o"; done
for f in "$CORE"/cores/arduino/*.S; do avr-gcc "${SFLAGS[@]}" "${MCU[@]}" "${INC[@]}" "$f" -o "$OUT/core/$(basename "$f").o"; done
avr-gcc-ar rcs "$OUT/core.a" "$OUT"/core/*.o

for f in "$ROOT"/libraries/JoystickFFB/src/*.cpp "$ROOT"/libraries/JoystickFFB/src/DynamicHID/*.cpp; do
  avr-g++ "${CXXFLAGS[@]}" "${MCU[@]}" "${INC[@]}" "$f" -o "$OUT/lib/$(basename "$f").o"
done

{ echo '#include <Arduino.h>'; echo '#line 1 "MalthProLeonardo.ino"'; cat "$ROOT/Leonardo/MalthProLeonardo/MalthProLeonardo.ino"; } > "$OUT/sketch/MalthProLeonardo.ino.cpp"
avr-g++ "${CXXFLAGS[@]}" "${MCU[@]}" "${INC[@]}" "$OUT/sketch/MalthProLeonardo.ino.cpp" -o "$OUT/sketch/ino.o"
avr-g++ "${CXXFLAGS[@]}" "${MCU[@]}" "${INC[@]}" "$ROOT/Leonardo/MalthProLeonardo/Controller.cpp" -o "$OUT/sketch/Controller.o"

avr-gcc -w -Os -g -flto -fuse-linker-plugin -Wl,--gc-sections -mmcu=atmega32u4 -o "$OUT/MalthProLeonardo.elf" \
  "$OUT"/sketch/*.o "$OUT"/lib/*.o "$OUT/core.a" -L"$OUT" -lm
avr-objcopy -O ihex -R .eeprom "$OUT/MalthProLeonardo.elf" "$OUT/MalthProLeonardo.hex"
mkdir -p "$ROOT/releases"
cp "$OUT/MalthProLeonardo.hex" "$ROOT/releases/Malth Pro-v$VERSION.hex"
avr-size -A "$OUT/MalthProLeonardo.elf" | awk '$1==".text"||$1==".data"||$1==".bss"{print}'
sha256sum "$ROOT/releases/Malth Pro-v$VERSION.hex"
