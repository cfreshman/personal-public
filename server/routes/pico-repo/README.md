## MicroPython installation & build requirements

### Initialize
#### MacOS
Install arm-none-eabi-gcc
```
brew install armmbed/formulae/arm-none-eabi-gcc
```

#### Ubuntu
```
sudo apt-get install gcc-arm-none-eabi libnewlib-arm-none-eabi build-essential cmake
```

#### Common
cd into MicroPython directory, then update submodules and make mpy-cross
```
git submodule update --init --recursive
cd mpy-cross
make
```

### Build for RP2
Build MicroPython for RP2 (Pico)
```
cd ../ports/rp2
make
```

Build a MicroPython app by copying the contents into `ports/rp2/modules`, then repeating the above
