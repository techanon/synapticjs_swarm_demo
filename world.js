

async function blastoff(){

	console.log('Running');

	const nodes = {
		count: document.querySelector('#count'),
		swarms: document.querySelector('#swarms'),
		selected: document.querySelector('#selected'),
		rate: document.querySelector('#rate'),
		mass: document.querySelector('#mass'),
		speed: document.querySelector('#speed'),
		force: document.querySelector('#force'),
		color: document.querySelector('#color'),
		pause: document.querySelector('#pause'),
		step: document.querySelector('#step'),
		calc: document.querySelector('#calcs'),
		frames: document.querySelector('#frames'),
		borders: document.querySelector('#borders'),
		mouse: document.querySelector('#mouse'),
		canvas: document.querySelector("#canvas")
	};

	const ctx = nodes.canvas.getContext('2d');

	// stats
	const calc = {current:0,count:0,sum:0};
	calc.node = nodes.calc;
	const frames = {current:0,count:0,sum:0};
	frames.node = nodes.frames;


	const world = {
		buffer: 5,
		swarms: [],
		width: 500,
		height: 500,
		ctx: ctx,
		mouse: {velocity:null,location:null,cohesion:0},
		selected: null,
		borders: 'avoid'
	};
	window.world = world;

	// simplified variable refs
	let {swarms,mouse} = world;

	// default values
	nodes.swarms.dataset.default = nodes.swarms.value = 1;
	nodes.selected.dataset.default = nodes.selected.value = 1;
	nodes.count.dataset.default = nodes.count.value = 15;
	nodes.rate.dataset.default = nodes.rate.value = .3;
	nodes.mass.dataset.default = nodes.mass.value = 5;
	nodes.speed.dataset.default = nodes.speed.value = 5;
	nodes.force.dataset.default = nodes.force.value = .2;

	var paused = false;
	var pause = Promise.resolve();
	var resolve = ()=>{};
	nodes.pause.addEventListener('change',e=>{
		if (e.target.checked) {
			paused = true;
			pause = new Promise(res=>resolve=res);
		} else {
			paused = false;
			resolve();
		}
	});

	nodes.step.addEventListener('click',e=>{
		if (paused){
			paused = false;
			resolve();
			pause = new Promise(res=>resolve=res);
			paused = true;
		}
	});


	nodes.borders.addEventListener('change',e=>world.borders=e.target.value);

	nodes.canvas.addEventListener('mousemove', e=>{
		mouse.location = new Vector(e.offsetX,e.offsetY);
		mouse.velocity = new Vector(e.movementX,e.movementY);
	});
	nodes.canvas.addEventListener('mouseout',e=>mouse.location = mouse.velocity = null);
	nodes.mouse.addEventListener('change',e=>{
		let val = parseInt(e.target.value);
		switch(val){
			case 2: mouse.cohesion = 2; break;
			case 1: mouse.cohesion = 1; break;
			case 0: default: mouse.cohesion = 0; break;
		}
	});

	// initial sizing
	world.width = (nodes.canvas.width = parseInt(nodes.canvas.getBoundingClientRect().width))+world.buffer*2;
	world.height = (nodes.canvas.height = parseInt(nodes.canvas.getBoundingClientRect().height))+world.buffer*2;

	// resizing
	window.addEventListener('resize', function(){
		world.width = (nodes.canvas.width = parseInt(nodes.canvas.getBoundingClientRect().width))+world.buffer*2;
		world.height = (nodes.canvas.height = parseInt(nodes.canvas.getBoundingClientRect().height))+world.buffer*2;
	});


	function limits(e){
		if (!e.target.value) e.target.value = e.target.dataset.default;
		if (e.target.value && parseFloat(e.target.value) > parseFloat(e.target.max)) e.target.value = e.target.max;
		if (e.target.value && parseFloat(e.target.value) < parseFloat(e.target.min)) e.target.value = e.target.min;
	}
	document.querySelectorAll('input[type="number"]').forEach(node=>node.addEventListener('change',limits));

	nodes.mass.addEventListener('change',e=>{  // mass
		if (world.selected == null || !swarms.length) return;
		world.selected.props({mass:parseFloat(e.target.value)});
	});
	nodes.force.addEventListener('change',e=>{  // force
		if (world.selected == null || !swarms.length) return;
		world.selected.props({force:parseFloat(e.target.value)});
	});
	nodes.speed.addEventListener('change',e=>{  // speed
		if (world.selected == null || !swarms.length) return;
		world.selected.props({speed:parseFloat(e.target.value)});
	});
	nodes.color.addEventListener('change',e=>{  // color
		if (world.selected == null || !swarms.length) return;
		world.selected.props({color:parseFloat(e.target.value)});
	});
	nodes.rate.addEventListener('change',e=>{  // rate
		if (world.selected == null || !swarms.length) return;
		world.selected.rate = parseFloat(e.target.value).toFixed(1);
	});
	nodes.count.addEventListener('change',e=>{  // count
		if (world.selected == null || !swarms.length) return;
		world.selected.creatureCount = parseInt(e.target.value,10);
	});
	nodes.swarms.addEventListener('change',e=>{  // swarms
		populate(parseInt(e.target.value));
	});
	nodes.selected.addEventListener('change',e=>{
		let index = parseInt(e.target.value);
		limits(e);
		if (world.selected == null || !swarms.length) return;

	});

	async function spawn(){
		let swarm = new Swarm(world,{
			count: parseInt(nodes.count.value,10),
			mass: parseFloat(nodes.mass.value),
			force: parseFloat(nodes.force.value),
			speed: parseInt(nodes.speed.value,10),
			//color: parseFloat(nodes.color.value),
			rate: parseFloat(nodes.rate.value)
		});
		swarms.push(swarm);
		if (world.selected == null) world.selected = swarm;
	}

	async function populate(count){
        let current = swarms.length;
        if (typeof count == undefined) count = swarms.length;
        let wait = [];
		if (current < count) {
			for (var i = 0; i < count-current; i++)
                wait.push(spawn());
            await Promise.all(wait);
		} else if (current > count) {
			swarms.splice(count);
			if (!~swarms.indexOf(world.selected))
				world.selected = swarms[swarms.length-1];
		}
		nodes.selected.max = swarms.length;
	}

	await populate(1);

	//world.selected.creatures[0].special = true;
	
	async function draw(){
		let {width,height,buffer,swarms} = world;
		if (paused) await pause;
		// global fade effect
		ctx.globalAlpha=0.2;
		ctx.fillStyle='#f4f4f4';
		ctx.fillRect(-buffer, -buffer, width +buffer, height +buffer);
		ctx.globalAlpha = 1;
		// render swarms
		swarms.forEach(s=>s.draw());
		frames.current++;
		setTimeout(draw,0);
	}
	draw();

	async function update(){
		if (paused) await pause;
		// update swarms
		swarms.forEach(s=>s.update());
		setTimeout(update,0);
		calc.current++;
	}
	update();
	
	async function stats(){
		if (paused) await pause;
		// Display calc stat
		calc.count++;
		calc.sum += calc.current;
		calc.node.dataset.before = calc.current;
		calc.node.dataset.after = (calc.sum/calc.count).toFixed(1);
		if (calc.count > 10) {
			calc.sum = 0;
			calc.count = 0;
		}
		calc.current = 0;

		// Display FPS stat
		frames.count++;
		frames.sum += frames.current;
		frames.node.dataset.before = frames.current;
		frames.node.dataset.after = (frames.sum/frames.count).toFixed(1);
		if (frames.count > 10) {
			frames.sum = 0;
			frames.count = 0;
		}
		frames.current = 0;
		setTimeout(stats,1000);
	}
	stats();

}


