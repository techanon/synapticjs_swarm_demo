function blastoff(){

	console.log('Running');
	var canvas = document.querySelector("#canvas");
	var ctx = canvas.getContext('2d');

	var calc = {current:0,count:0,sum:0};
	calc.node = document.querySelector('#calc');
	var frames = {current:0,count:0,sum:0};
	frames.node = document.querySelector('#render');

	var count = parseInt(document.querySelector('#count').value||10,10);
	document.querySelector('#count').addEventListener('change',e=>{
		if (e.target.value && e.target.value > 100) e.target.value = 100;
		if (e.target.value && e.target.value < 10) e.target.value = 10;
		count = parseInt(e.target.value||10,10);
	});

	var learnRate = parseFloat(document.querySelector('#rate').value||.3).toFixed(1);
	document.querySelector('#rate').addEventListener('change',e=>learnRate=parseFloat(e.target.value||.3).toFixed(1));

	var paused = false;
	var pause = Promise.resolve();
	var resolve = ()=>{};
	document.querySelector('#pause').addEventListener('change',e=>{
		if (e.target.checked) {
			paused = true;
			pause = new Promise((res)=>{resolve = res;});
		} else {
			paused = false;
			resolve();
		}
	});


	var boundryMode;
	document.querySelector('#boundries').addEventListener('change',e=>boundryMode=e.target.value);

	var mouse = {velocity:null,location:null};

	canvas.addEventListener('mousemove', e=>{
		mouse.location = new Vector(e.offsetX,e.offsetY);
		mouse.velocity = new Vector(e.movementX,e.movementY);
	});
	canvas.addEventListener('mouseout',e=>mouse.location = mouse.velocity = null);
	mouse.cohesion = 0;
	document.querySelector('#mouse').addEventListener('change',e=>{
		let val = parseInt(e.target.value);
		switch(val){
			case 0:
				mouse.cohesion = 0;
				break;
			case 1:
				mouse.cohesion = 1;
				break;
			case 2:
				mouse.cohesion = world.creatures.length;
				break;
		}
	});

	var world = {
		width: 0,
		height: 0,
		creatures: [],
		width: 500,
		height: 500,
		context: ctx
	};
	window.world = world;

	world.width = canvas.width = parseInt(canvas.getBoundingClientRect().width);
	world.height = canvas.height = parseInt(canvas.getBoundingClientRect().height);

	window.addEventListener('resize', function(){
		world.width = canvas.width = parseInt(canvas.getBoundingClientRect().width);
		world.height = canvas.height = parseInt(canvas.getBoundingClientRect().height);
	});

	var targetX = function(creature){
		let creatures = world.creatures;
		if (mouse.location != null && mouse.velocity != null && mouse.cohesion) 
			creatures = creatures.concat(Array(mouse.cohesion).fill(mouse));
		var cohesion = creature.cohesion(creatures,boundryMode=='none');
		return cohesion.x / world.width;
	}

	var targetY = function(creature){
		let creatures = world.creatures;
		if (mouse.location != null && mouse.velocity != null && mouse.cohesion) 
			creatures = creatures.concat(Array(mouse.cohesion).fill(mouse));
		var cohesion = creature.cohesion(creatures,boundryMode=='none');
		return cohesion.y / world.height;
	}

	var targetAngle = function(creature){
		let creatures = world.creatures;
		if (mouse.location != null && mouse.velocity != null) 
			creatures = creatures.concat(mouse);
		var alignment = creature.align(creatures);
		return (alignment.angle() + Math.PI) / (Math.PI*2);
	}

	async function updateCreatures(mode='all',target){
		if (mode=='all'||mode=='mass')
			world.creatures.forEach(c=>c.updateProperties({mass:(target||document.querySelector('#mass')).value}));
		if (mode=='all'||mode=='force')
			world.creatures.forEach(c=>c.updateProperties({force:(target||document.querySelector('#force')).value}));
		if (mode=='all'||mode=='speed')
			world.creatures.forEach(c=>c.updateProperties({speed:(target||document.querySelector('#speed')).value}));
		if (mode=='all'||mode=='color')
			world.creatures.forEach(c=>c.updateProperties({color:(target||document.querySelector('#color')).value}));
	}

	async function updateCreature(creature,mode='all',target){
		if (mode=='all'||mode=='mass')
			creature.updateProperties({mass:(target||document.querySelector('#mass')).value});
		if (mode=='all'||mode=='force')
			creature.updateProperties({force:(target||document.querySelector('#force')).value});
		if (mode=='all'||mode=='speed')
			creature.updateProperties({speed:(target||document.querySelector('#speed')).value});
		if (mode=='all'||mode=='color')
			creature.updateProperties({color:(target||document.querySelector('#color')).value});
	}

	document.querySelector('#mass').addEventListener('change',e=>updateCreatures('mass',e.target));
	document.querySelector('#force').addEventListener('change',e=>updateCreatures('force',e.target));
	document.querySelector('#speed').addEventListener('change',e=>updateCreatures('speed',e.target));
	document.querySelector('#color').addEventListener('change',e=>updateCreatures('color',e.target));

	async function populate(num){
		let current = world.creatures.length;
		if (current < num) {
			for (var i = 0; i < num-current; i++)
			{
				var x = Math.random() * world.width;
				if (x < 15 || x > world.width-15) 
					x = (x+30) % world.width;

				var y = Math.random() * world.height;
				if (y < 15 || y > world.height-15) 
					y = (x+30) % world.height;

				var c = new Creature(world, x, y);
				c.velocity.random();
				world.creatures.push(c);
				updateCreature(c);
			}
		} else if (current > num) {
			world.creatures.splice(num);
		}
	}
	populate(count).then(_=>
		world.creatures[world.creatures.length-1].special = true
	);

	var check = 0;	
	async function calculate(){
		if (paused) await pause;
		// fade effect
		ctx.globalAlpha=0.2;
		ctx.fillStyle='#f4f4f4';
		ctx.fillRect(0,0,world.width, world.height);
		ctx.globalAlpha=1;

		// update each creature
		var creatures = world.creatures;
		creatures.forEach(function(creature){
			// move
			var input = [];
			if (mouse.location != null && mouse.velocity != null && mouse.cohesion){
				for (let i = 0; i < mouse.cohesion; i++){
					input.push(mouse.location.x);
					input.push(mouse.location.y);
					input.push(mouse.velocity.x);
					input.push(mouse.velocity.y);
				}
			}
			for (var i in creatures){
				input.push(creatures[i].location.x);
				input.push(creatures[i].location.y);
				input.push(creatures[i].velocity.x);
				input.push(creatures[i].velocity.y);
			}
			var output = creature.network.activate(input);
			// console.log(output);
			creature.moveTo(output,mouse,boundryMode=='none');


			// learn
			var target = [targetX(creature), targetY(creature), targetAngle(creature)];
			// console.log('target',target);
			creature.network.propagate(learnRate, target);
			creature.update(boundryMode);
		});
		setTimeout(calculate,0);
		calc.current++;
	}

	calculate();

	async function render(){
		if (paused) await pause;
		world.creatures.forEach(c=>c.draw());
		setTimeout(render,0);
		frames.current++;
		if (count != world.creatures.length) populate(count);
	}
	render();
	
	async function statsloop(){
		if (paused) await pause;
		setTimeout(statsloop,1000);
		// Display calc stat
		calc.count++;
		calc.sum += calc.current;
		calc.node.innerText = calc.current +' - Avg: '+ (calc.sum/calc.count).toFixed(1);
		if (calc.count > 10) {
			calc.sum = parseInt(calc.sum/2,10);
			calc.count = parseInt(calc.count/2,10);
		}
		calc.current = 0;

		// Display FPS stat
		frames.count++;
		frames.sum += frames.current;
		frames.node.innerText = frames.current +' - Avg: '+ (frames.sum/frames.count).toFixed(1);
		if (frames.count > 10) {
			frames.sum = parseInt(frames.sum/2,10);
			frames.count = parseInt(frames.count/2,10);
		}
		frames.current = 0;
	}
	statsloop();
};

