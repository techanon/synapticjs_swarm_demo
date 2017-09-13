
const HALF_PI = Math.PI * .5;
const TWO_PI = Math.PI * 2;
const THIRD_PI = TWO_PI / 3;

class Creature {
	constructor(swarm, x, y, props={}){
		this.swarm = swarm;
		this.world = swarm.world;
		this.location = new Vector(x, y);
		this.velocity = new Vector(0, 0);
		this.acceleration = new Vector(0, 0);
		this.special = false;
		this.mass = 5;
		this.maxforce = 0.2;
		this.speed = 5;
		this.color = 0;
		this.props(props);
	}

	props({mass,speed,force,color}){
		this.maxspeed = speed||this.maxspeed;
		this.mass = mass||this.mass;
		this.maxforce = force||this.maxforce;
		this.color = color||this.color;
		this.lookRange = this.mass * 200;
		this.length = this.mass * 10;
		this.base = this.mass;
		this.spacing = this.mass *3 +10;

	}

	moveTo(networkOutput){
		let force = new Vector(0,0);
		let {mouse,width,height,buffer} = this.world;
		let {creatures} = this.swarm;
		let target = new Vector(networkOutput[0] * width, networkOutput[1] * height);
		let angle = (networkOutput[2] * TWO_PI) - Math.PI;
		let separation = this.separate(creatures);
		if (mouse.location != null && mouse.velocity != null && mouse.cohesion>0) 
			creatures = creatures.concat(Array(mouse.cohesion).fill(mouse));
		let alignment = this.align(creatures).setAngle(angle);
		let cohesion = this.seek(target);
		// if (this.special) console.log(separation,alignment,cohesion);

		force.add(separation);
		force.add(alignment);
		force.add(cohesion);

		this.applyForce(force);
	}

	draw() {

		let {ctx,buffer} = this.world;
		let x,x1,x2,x3,y,y1,y2,y3;

		let angle = this.velocity.angle();
		x = this.location.x - buffer;
		y = this.location.y - buffer;
		x1 = x + Math.cos(angle) * this.base;
		y1 = y + Math.sin(angle) * this.base;
		// if (this.special) console.log(angle,Math.cos(angle),Math.sin(angle));

		x2 = x + Math.cos(angle + HALF_PI) * this.base;
		y2 = y + Math.sin(angle + HALF_PI) * this.base;

		x3 = x + Math.cos(angle - HALF_PI) * this.base;
		y3 = y + Math.sin(angle - HALF_PI) * this.base;

		ctx.lineWidth = 2;
		// let color = ((this.color.rgb[0] & 0xFF) << 16) | ((this.color.rgb[1] & 0xFF) << 8) | (this.color.rgb[2] & 0xFF)
		// let hex = '#'+(color).toString(16).substr(0,6);
		if (this.special) ctx.fillStyle = ctx.strokeStyle = '#ff0000';
		else ctx.fillStyle = ctx.strokeStyle = this.color || '#222222';
		ctx.beginPath();
		ctx.moveTo(x1,y1);
		ctx.lineTo(x2,y2);
		ctx.lineTo(x3,y3);
		ctx.lineTo(x1,y1);
		ctx.stroke();
		ctx.fill();
	}

	getColor(){

		// TODO generate RGB from hue angle value;
		let rgb = [22,22,22];
		let hex = ((rgb[0] & 0xFF) << 16) | ((rgb[1] & 0xFF) << 8) | (rgb[2] & 0xFF);
		if (this.special) console.log('#'+hex.toString(16).substr(0,6));
	}

	update() {
		this.borders();
		this.velocity.add(this.acceleration);
	    this.velocity.limit(this.maxspeed);
	    if(this.velocity.mag() < 1.5) // minspeed
	    	this.velocity.setMag(1.5);
		this.location.add(this.velocity);
	    this.acceleration.mul(0);
	}

	applyForce(force){
		this.acceleration.add(force);
	}

	borders(){
		let a = this.location.copy().add(this.velocity);
		let b = null;
		switch(this.world.borders){
			case 'none':
				if (this.location.x < 0){
					this.location.x += this.world.width;
				}
				if (this.location.x > this.world.width){
					this.location.x -= this.world.width;
				}
				if (this.location.y < 0){
					this.location.y += this.world.height;
				}
				if (this.location.y > this.world.height) {
					this.location.y -= this.world.height;
				}
				break;
			case 'bounce':
				if (b == null) b = 1;
				// similar functionality, fall through
			case 'crash':
				if (b == null) b = 0;
				if (a.x < this.world.buffer){
					this.location.x = this.world.buffer;
					this.velocity.x *= b*-1;
					this.location.y = a.y;
				} 
				if (a.x > this.world.width-this.world.buffer){
					this.location.x = this.world.width-this.world.buffer;
					this.velocity.x *= b*-1;
					this.location.y = a.y;
				}

				if (a.y < this.world.buffer){
					this.location.y = this.world.buffer; // hold location at edge
					this.velocity.y *= b*-1; // interact with wall
					this.location.x = a.x; // drift along the wall
				} 
				if (a.y > this.world.height-this.world.buffer){
					this.location.y = this.world.height-this.world.buffer;
					this.velocity.y *= b*-1;
					this.location.x = a.x;
				}
				break;
			case 'avoid':
			default:
				// TODO change to a logrithmic force application
				if (this.location.x < 100)
					this.applyForce(new Vector(this.maxforce * 0.5, 0));
				if (this.location.x < 50)
					this.applyForce(new Vector(this.maxforce * 1, 0));
				if (this.location.x < 30)
					this.applyForce(new Vector(this.maxforce * 2.5, 0));
				if (this.location.x < 15)
					this.applyForce(new Vector(this.maxforce * 4, 0));

				if (this.location.x > this.world.width - 100)
					this.applyForce(new Vector(-this.maxforce * 0.5, 0));
				if (this.location.x > this.world.width - 50)
					this.applyForce(new Vector(-this.maxforce * 1, 0));
				if (this.location.x > this.world.width - 30)
					this.applyForce(new Vector(-this.maxforce * 2.5, 0));
				if (this.location.x > this.world.width - 15)
					this.applyForce(new Vector(-this.maxforce * 4, 0));

				if (this.location.y < 100)
					this.applyForce(new Vector(0, this.maxforce * 0.5));
				if (this.location.y < 50)
					this.applyForce(new Vector(0, this.maxforce * 1));
				if (this.location.y < 30)
					this.applyForce(new Vector(0, this.maxforce * 2.5));
				if (this.location.y < 15)
					this.applyForce(new Vector(0, this.maxforce * 4));
				
				if (this.location.y > this.world.height - 100)
					this.applyForce(new Vector(0, -this.maxforce * 0.5));
				if (this.location.y > this.world.height - 50)
					this.applyForce(new Vector(0, -this.maxforce * 1));
				if (this.location.y > this.world.height - 30)
					this.applyForce(new Vector(0, -this.maxforce * 2.5));
				if (this.location.y > this.world.height - 15)
					this.applyForce(new Vector(0, -this.maxforce * 4));
		}
	}

	seek(target){
		let seek = target.copy().sub(this.location)
		seek.normalize();
		seek.mul(this.maxspeed);
		seek.sub(this.velocity).limit(0.3);
		return seek;
	}

	separate(neighboors) {
		var sum = new Vector(0,0);
		var count = 0;

		for (var i in neighboors)
		{
			if (neighboors[i] != this)
			{	
				let loc = neighboors[i].location;
				loc = this.nearest(loc);
				var d = this.location.dist(loc)
				if (d < this.spacing && d > 0)
				{
					var diff = this.location.copy().sub(loc);
					diff.normalize();
					diff.div(d);
					sum.add(diff);
					count++;
				}
			}
		}	
		if (!count)
			return sum;

		sum.div(count);
		sum.normalize();
		sum.mul(this.maxspeed);
		sum.sub(this.velocity)
		sum.limit(this.maxforce);

		return sum.mul(2);
	}

	align(neighboors) {
		let sum = new Vector(0,0);
		let count = 0;
		for (let i in neighboors)
			if (neighboors[i] != this)// && !neighboors[i].special)
			{
				sum.add(neighboors[i].velocity);
				count++;
			}
		sum.div(count||1);
		sum.normalize();
		sum.mul(this.maxspeed);

		sum.sub(this.velocity).limit(this.maxspeed);

		return sum.limit(.1);
	}

	cohesion (neighboors) {
		var sum = new Vector(0,0);
		var count = 0;
		for (var i in neighboors)
		{
			let loc = neighboors[i].location;
			loc = this.nearest(loc);
			if (neighboors[i] != this)// && !neighboors[i].special)
			{
				sum.add(loc);
				count++;
			}
		}	
		sum.div(count);

		return sum;
	}

	nearest (target) {
		let {borders,width,height} = this.world;
		if (borders != 'none') return target;
		// l = less, s = same, m = more; first char is x, second char is y
		let ll = new Vector(target.x-width,target.y-height);
		ll.type = 'll';
		let mm = new Vector(target.x+width,target.y+height);
		mm.type = 'mm';
		let lm = new Vector(target.x-width,target.y+height);
		lm.type = 'lm';
		let ml = new Vector(target.x+width,target.y-height);
		ml.type = 'ml';
		let ls = new Vector(target.x-width,target.y);
		ls.type = 'ls';
		let ms = new Vector(target.x+width,target.y);
		ms.type = 'ms';
		let sl = new Vector(target.x,target.y-height);
		sl.type = 'sl';
		let sm = new Vector(target.x,target.y+height);
		sm.type = 'sm';

		let _ll = this.location.dist(ll);
		let _mm = this.location.dist(mm);
		let _ml = this.location.dist(ml);
		let _lm = this.location.dist(lm);
		let _ls = this.location.dist(ls);
		let _ms = this.location.dist(ms);
		let _sl = this.location.dist(sl);
		let _sm = this.location.dist(sm);
		let _ss = this.location.dist(target);

		let min = Math.min(_ll,_mm,_lm,_ml,_ls,_ms,_sl,_sm,_ss);
		switch(min){
			case _ll: return ll;
			case _mm: return mm;
			case _lm: return lm;
			case _ml: return ml;
			case _ls: return ls;
			case _ms: return ms;
			case _sl: return sl;
			case _sm: return sm;
			default:  return target;
		}
	}
}