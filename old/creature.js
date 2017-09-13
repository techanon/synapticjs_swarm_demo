function Creature(world, x, y, props={})
{
	this.network = new Architect.Perceptron(40, 25, 3);
	this.world = world;
	this.updateProperties(props);
	this.HALF_PI = Math.PI * .5;
	this.TWO_PI = Math.PI * 2;
	this.location = new Vector(x, y);
	this.velocity = new Vector(0, 0);
	this.acceleration = new Vector(0, 0);
}

Creature.prototype = {

	updateProperties: function({mass,speed,force,color,mode}){
		this.maxspeed = speed||this.maxspeed||.3;
		this.mass = mass||this.mass||5;
		this.maxforce = force||this.maxforce||.2;
		this.color = color||this.color||"#222222";
		this.boundryMode = mode||this.boundryMode||'avoid';
		this.lookRange = this.mass * 200;
		this.length = this.mass * 10;
		this.base = this.length * .5;

	},

	moveTo: function(networkOutput,mouse,wrap=false){
		var force = new Vector(0,0);
		
		var target = new Vector(networkOutput[0] * this.world.width, networkOutput[1] * this.world.height);
		var angle = (networkOutput[2] * this.TWO_PI) - Math.PI;
		let creatures = this.world.creatures;
		if (mouse.location != null && mouse.velocity != null && mouse.cohesion>0) 
			creatures = creatures.concat(Array(mouse.cohesion).fill(mouse));
		var separation = this.separate(this.world.creatures,wrap);
		var alignment = this.align(creatures).setAngle(angle);
		var cohesion = this.seek(target);
		if (this.special) console.log(separation,alignment,cohesion);

		force.add(separation);
		force.add(alignment);
		force.add(cohesion);

		this.applyForce(force);
	},

	draw: function()
	{
		//this.update();

		var ctx = this.world.context;
		ctx.lineWidth = 1;

		var angle = this.velocity.angle();
		let x = this.location.x;
		let y = this.location.y;
		x1 = x + Math.cos(angle) * this.base;
		y1 = y + Math.sin(angle) * this.base;

		x2 = x + Math.cos(angle + this.HALF_PI) * this.base;
		y2 = y + Math.sin(angle + this.HALF_PI) * this.base;

		x3 = x + Math.cos(angle - this.HALF_PI) * this.base;
		y3 = y + Math.sin(angle - this.HALF_PI) * this.base;

		ctx.lineWidth = 2;
		if (this.special) ctx.fillStyle = ctx.strokeStyle = '#ff0000';
		else ctx.fillStyle = ctx.strokeStyle = this.color || '#222222';
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2,y2);
		ctx.lineTo(x3,y3);
		ctx.stroke();
		ctx.fill();
	},

	update: function(boundryMode)
	{
		this.boundaries(boundryMode);
		this.velocity.add(this.acceleration);
	    this.velocity.limit(this.maxspeed);
	    if(this.velocity.mag() < 1.5)
	    	this.velocity.setMag(1.5);
	    this.location.add(this.velocity);
	    this.acceleration.mul(0);
	},

	applyForce: function(force)
	{
		this.acceleration.add(force);
	},


	boundaries: function(mode)
	{
		switch(mode){
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
				if (this.location.x < 15){
					this.velocity.x *= -1;
				}
				if (this.location.x > this.world.width-15){
					this.velocity.x *= -1;
				}
				if (this.location.y < 15){
					this.velocity.y *= -1;
				}
				if (this.location.y > this.world.height-15) {
					this.velocity.y *= -1;
				}
				break;
			case 'crash':
				if (this.location.x < 15){
					this.location.x = 15;
					this.applyForce(new Vector(this.maxforce * 2, 0));
				}
				if (this.location.x >= this.world.width-15){
					this.location.x = this.world.width-15;
					this.applyForce(new Vector(-this.maxforce * 2, 0));
				}
				if (this.location.y < 15){
					this.location.y = 15;
					this.applyForce(new Vector(0, this.maxforce * 2));
				}
				if (this.location.y >= this.world.height-15) {
					this.location.y = this.world.height-15;
					this.applyForce(new Vector(0, -this.maxforce * 2));
				}
				break;
			case 'avoid':
			default:
				if (this.location.x < 50)
					this.applyForce(new Vector(this.maxforce * 1, 0));
				if (this.location.x < 30)
					this.applyForce(new Vector(this.maxforce * 2.5, 0));
				if (this.location.x < 15)
					this.applyForce(new Vector(this.maxforce * 4, 0));

				if (this.location.x > this.world.width - 50)
					this.applyForce(new Vector(-this.maxforce * 1, 0));
				if (this.location.x > this.world.width - 30)
					this.applyForce(new Vector(-this.maxforce * 2.5, 0));
				if (this.location.x > this.world.width - 15)
					this.applyForce(new Vector(-this.maxforce * 4, 0));

				if (this.location.y < 50)
					this.applyForce(new Vector(0, this.maxforce * 1));
				if (this.location.y < 30)
					this.applyForce(new Vector(0, this.maxforce * 2.5));
				if (this.location.y < 15)
					this.applyForce(new Vector(0, this.maxforce * 4));
				
				if (this.location.y > this.world.height - 50)
					this.applyForce(new Vector(0, -this.maxforce * 1));
				if (this.location.y > this.world.height - 30)
					this.applyForce(new Vector(0, -this.maxforce * 2.5));
				if (this.location.y > this.world.height - 15)
					this.applyForce(new Vector(0, -this.maxforce * 4));
		}
		
		// console.log(pre, this.velocity.x);
	},

	seek: function(target)
	{
		var seek = target.copy().sub(this.location)
		seek.normalize();
		seek.mul(this.maxspeed);
		seek.sub(this.velocity).limit(0.3);
		
		return seek;
	},

	separate: function(neighboors,wrap=false)
	{
		var sum = new Vector(0,0);
		var count = 0;

		for (var i in neighboors)
		{
			if (neighboors[i] != this)
			{	
				let loc = neighboors[i].location;
				if (wrap) loc = this.nearest(loc);
				var d = this.location.dist(loc)
				if (d < 24 && d > 0)
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
	},

	align: function(neighboors)
	{
		var sum = new Vector(0,0);
		var count = 0;
		for (var i in neighboors)
		{
			if (neighboors[i] != this)// && !neighboors[i].special)
			{
				sum.add(neighboors[i].velocity);
				count++;
			}
		}	
		sum.div(count);
		sum.normalize();
		sum.mul(this.maxspeed);

		sum.sub(this.velocity).limit(this.maxspeed);

		return sum.limit(.1);
	},

	cohesion: function(neighboors,wrap=false)
	{
		var sum = new Vector(0,0);
		var count = 0;
		for (var i in neighboors)
		{
			let loc = neighboors[i].location;
			if (wrap) loc = this.nearest(loc);
			if (neighboors[i] != this)// && !neighboors[i].special)
			{
				sum.add(loc);
				count++;
			}
		}	
		sum.div(count);

		return sum;
	},

	nearest: function(target)
	{
		// l = less, s = same, m = more; first char is x, second char is y
		let ll = new Vector(target.x-this.world.width,target.y-this.world.height);
		let mm = new Vector(target.x+this.world.width,target.y+this.world.height);
		let lm = new Vector(target.x-this.world.width,target.y+this.world.height);
		let ml = new Vector(target.x+this.world.width,target.y-this.world.height);
		let ls = new Vector(target.x-this.world.width,target.y);
		let ms = new Vector(target.x+this.world.width,target.y);
		let sl = new Vector(target.x,target.y-this.world.height);
		let sm = new Vector(target.x,target.y+this.world.height);

		let _ll = this.location.dist(ll);
		let _mm = this.location.dist(mm);
		let _ml = this.location.dist(ml);
		let _lm = this.location.dist(lm);
		let _ls = this.location.dist(ls);
		let _ms = this.location.dist(ms);
		let _sl = this.location.dist(sl);
		let _sm = this.location.dist(sm);

		let min = Math.min(_ll,_mm,_lm,_ml,_ls,_ms,_sl,_sm,this.location.dist(target));
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