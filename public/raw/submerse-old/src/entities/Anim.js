export class Anim {
  skins
  time
  counter

  constructor(props) {
    this.skins = props.skins ?? [props.skin];
    this.time = props.time ?? 1;
    this.counter = props.counter ?? 0;
  }

  update(amount) {
    this.counter = (this.counter + amount) % (this.skins.length * this.time)
  }

  get() {
    return this.skins[this.index()]
  }

  index() {
    return Math.floor(this.counter / this.time) % this.skins.length
  }
}