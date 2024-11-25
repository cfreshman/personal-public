let seed = rand.i(1e12)

const zoom = 1024
export const get_height = (x, layer=0) => {
  // TESTING
  // between islands, value is lerped to -1
  const island_spacing = 400
  const island_width = 1600
  const island_period = island_spacing + island_width
  const island_center = island_period/2
  const island_distance = Math.min(Math.abs(x % island_period - island_center), Math.abs(x % island_period + island_period - island_center))
  if (island_distance < island_width/2) {
    return 1
  }
  let lerp = (island_distance - island_width/2) / (island_width/2)
  return -1 // noise_value * (1 - lerp) - 1 * lerp
  

  // const y = layer * 5
  // const huge = noise.simplex2(x/zoom/4 - 10000 + seed, y/zoom/4 - 10000 + seed)
  // const large = noise.simplex2(x/zoom*2 + 10000 + seed, y/zoom*2 + 10000 + seed)
  // const medium = noise.simplex2(x/zoom*4 + 20000 + seed, y/zoom*4 + 20000 + seed)
  // const small = noise.simplex2(x/zoom*10 + 30000 + seed, y/zoom*10 + 30000 + seed)
  // const noise_value = huge*0.3 + large*0.5 + medium*0.15 + small*0.05

  // // return noise_value

  // const sin_value = Math.sin(x/4000 - Math.PI/2) * .5 + .5
  // // return ((noise_value * .5 + .5) * sin_value) * 2 - 1
  // return sin_value * 2 - 1
  
  // // islands are spaced out every 40 units and are 20 units wide
  // // between islands, value is lerped to -1
  // const island_spacing = 200
  // const island_width = 100
  // const island_period = island_spacing + island_width
  // const island_center = island_period/2
  // const island_distance = Math.min(Math.abs(x % island_period - island_center), Math.abs(x % island_period + island_period - island_center))
  // if (island_distance < island_width/2) {
  //   return noise_value
  // }
  // let lerp = (island_distance - island_width/2) / (island_width/2)
  // return noise_value * (1 - lerp) - 1 * lerp
}

export const reseed = () => seed = rand.i(1e12)