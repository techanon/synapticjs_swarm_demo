

class Swarm {
    constructor(world,{count=0,rate,speed,force,mass,color}) {
        this.world = world;
        this.network = null;
        this.creatures = [];
        this.creatureCount = count;
        // this.color = new Vector()
        this.properties = {speed,force,mass,color};
        this.rate = rate || .3;
        this.populate(this.creatureCount);
    }

    props({rate,speed,force,mass,color}) {
        this.rate = rate||this.rate;
        this.properties = {speed,force,mass,color};
        if ([speed,force,mass,color].filter(i=>i!=undefined).length)
            this.creatures.forEach(c=>c.props(this.properties));
    }

    async spawn(){
        let {height,width,buffer} = this.world;
        let x = Math.random() * width;
        if (x < buffer || x > width - buffer) 
            x = (x+30) % width;

        let y = Math.random() * height;
        if (y < buffer || y > height - buffer) 
            y = (x+30) % height;

        let c = new Creature(this, x, y, this.properties);
        c.velocity.random();
        this.creatures.push(c);
    }

    async populate(count) {
        let current = this.creatures.length;
        if (typeof count == undefined) count = this.creatures.length;
        let wait = [];
		if (current < count) {
			for (var i = 0; i < count-current; i++)
                wait.push(this.spawn());
            await Promise.all(wait);
		} else if (current > count) {
			this.creatures.splice(count);
        }
        
        if (current != count) {
            this.network = new Architect.Perceptron(this.creatures.length*4, Math.floor(this.creatures.length/2), 3);
        }
    }

    async update() {
        let creatures = this.creatures;
        let {mouse} = this.world;
		creatures.forEach((creature)=>{
			// move
            let input = [];
			if (mouse && mouse.location != null && mouse.velocity != null && mouse.cohesion){
				for (let i = 0; i < mouse.cohesion; i++){
					input.push(mouse.location.x);
					input.push(mouse.location.y);
					input.push(mouse.velocity.x);
					input.push(mouse.velocity.y);
				}
			}
			for (let i in creatures){
				input.push(creatures[i].location.x);
				input.push(creatures[i].location.y);
				input.push(creatures[i].velocity.x);
				input.push(creatures[i].velocity.y);
			}
			let output = this.network.activate(input);
			creature.moveTo(output);

            // learn
            let target = this.target(creature);
            // if (creature.special) console.log(target);
			this.network.propagate(this.rate, target);
			creature.update();
		});
    }

    async draw() {
		this.populate(this.creatureCount);
		this.creatures.forEach(c=>c.draw());
    }

    target(creature) {
        let creatures = this.creatures;
        let {mouse,height,width} = this.world;
        if (mouse.cohesion == 2) mouse.cohesion = this.creatures.length;
        if (mouse.location != null && mouse.velocity != null && mouse.cohesion) 
            creatures = creatures.concat(Array(mouse.cohesion).fill(mouse));
        let cohesion = creature.cohesion(creatures);
        let alignment = creature.align(creatures);
        return [
            cohesion.x / width, cohesion.y / height,
            (alignment.angle() + Math.PI) / (Math.PI*2)
        ];

    }

    // target(c) {
    //     return [this.targetX(c), this.targetY(c), this.targetAngle(c)];
    // }

	// targetX (creature){
    //     let mouse = this.world.mouse;
    //     let creatures = this.creatures;
	// 	// if (mouse.location != null && mouse.velocity != null && mouse.cohesion) 
	// 	// 	creatures = creatures.concat(Array(mouse.cohesion).fill(mouse));
	// 	var cohesion = creature.cohesion(creatures);
	// 	return cohesion.x / this.world.width;
	// }

	// targetY (creature){
	// 	let {creatures,mouse} = this.world;
	// 	// if (mouse.location != null && mouse.velocity != null && mouse.cohesion) 
	// 	// 	creatures = creatures.concat(Array(mouse.cohesion).fill(mouse));
	// 	var cohesion = creature.cohesion(creatures);
	// 	return cohesion.y / this.world.height;
	// }

	// targetAngle (creature){
	// 	let {creatures,mouse} = this.world;
	// 	// if (mouse.location != null && mouse.velocity != null) 
	// 	// 	creatures = creatures.concat(mouse);
	// 	var alignment = creature.align(creatures);
	// 	return (alignment.angle() + Math.PI) / (Math.PI*2);
	// }


}
