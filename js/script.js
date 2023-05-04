const container = document.getElementById("container");
let clock = new THREE.Clock();
const gui = new dat.GUI();

let scene, camera, renderer, material;
let settings = { fps: 24, scale: 0.25, parallaxVal: 0, mouse: true };
//mouse drag
let startX,
  startY,
  delta = 10,
  isDrag = false;

//custom events
const sceneLoadedEvent = new Event("sceneLoaded");

async function init() {
  renderer = new THREE.WebGLRenderer({
    antialias: false,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(settings.scale);
  container.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  material = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0, type: "f" },
      u_fog: { value: true, type: "b" },
      u_speed: { value: 0.25, type: "f" },
      u_scale: { value: 0.61, type: "f" },
      u_scale2: { value: 0.57, type: "f" },
      u_iters: { value: 5, type: "i" },
      u_color1: { value: new THREE.Color("#87b0b7"), type: "c" },
      u_fog_color: { value: new THREE.Color("#0f1c1c"), type: "c" },
      u_brightness: { value: 1, type: "f" },
      u_mouse: { value: new THREE.Vector4(), type: "v4" },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight), type: "v2" },
    },
    vertexShader: `
          varying vec2 vUv;        
          void main() {
              vUv = uv;
              gl_Position = vec4( position, 1.0 );    
          }
        `,
  });
  this.onmouseup = mouseUp;
  this.onmousedown = mouseDown;
  this.onmousemove = mouseMove;

  material.fragmentShader = await (await fetch("shaders/clouds.frag")).text();
  resize();

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 1, 1), material);
  scene.add(quad);

  window.addEventListener("resize", (e) => resize());
  render();
  datUI();

  document.dispatchEvent(sceneLoadedEvent);
}

function mouseDown(e) {
  isDrag = true;
  startX = e.pageX;
  startY = e.pageY;
}

function mouseUp(e) {
  isDrag = false;
}

function mouseMove(e) {
  if (settings.mouse) {
    if ((Math.abs(e.pageX - startX) < delta && Math.abs(e.pageY - startY) < delta) || !isDrag) {
      //click
    } else {
      //mouse pixel coords. xy: current (if MLB down), zw: click
      material.uniforms.u_mouse.value.x = e.pageX * settings.scale;
      material.uniforms.u_mouse.value.y = e.pageY * settings.scale;
      material.uniforms.u_mouse.value.z = 1;
      material.uniforms.u_mouse.value.w = 1;
    }
  }

  if (settings.parallaxVal != 0) {
    const x = (window.innerWidth - e.pageX * settings.parallaxVal) / 90;
    const y = (window.innerHeight - e.pageY * settings.parallaxVal) / 90;

    container.style.transform = `translateX(${x}px) translateY(${y}px) scale(1.09)`;
  }
}

function setScale(value) {
  if (settings.scale == value) return;

  settings.scale = value;
  renderer.setPixelRatio(settings.scale);
  material.uniforms.u_resolution.value = new THREE.Vector2(
    window.innerWidth * settings.scale,
    window.innerHeight * settings.scale
  );
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  material.uniforms.u_resolution.value = new THREE.Vector2(
    window.innerWidth * settings.scale,
    window.innerHeight * settings.scale
  );
}

function render() {
  setTimeout(function () {
    requestAnimationFrame(render);
  }, 1000 / settings.fps);

  //reset every 6hr
  if (clock.getElapsedTime() > 21600) clock = new THREE.Clock();
  material.uniforms.u_time.value = clock.getElapsedTime();

  renderer.render(scene, camera);
}

init();

//lively api
//docs: https://github.com/rocksdanister/lively/wiki/Web-Guide-IV-:-Interaction
function livelyPropertyListener(name, val) {
  switch (name) {
    case "scale1":
      material.uniforms.u_scale.value = val;
      break;
    case "scale2":
      material.uniforms.u_scale2.value = val;
      break;
    case "iter":
      material.uniforms.u_iters.value = val;
      break;
    case "brightness":
      material.uniforms.u_brightness.value = val;
      break;
    case "densityColor":
      material.uniforms.u_color1.value = new THREE.Color(val);
      break;
    case "fogColor":
      material.uniforms.u_fog_color.value = new THREE.Color(val);
      break;
    case "mouseClick":
      settings.mouse = val;
      break;
    case "fog":
      material.uniforms.u_fog.value = val;
      break;
    case "fpsLock":
      settings.fps = val ? 24 : 60;
      break;
    case "displayScaling":
      setScale(val);
      break;
    case "debug":
      if (val) gui.show();
      else gui.hide();
      break;
  }
}

//web
function datUI() {
  let cloud = gui.addFolder("Clouds");
  let perf = gui.addFolder("Performance");
  let misc = gui.addFolder("More");
  misc.open();
  perf.open();
  cloud.open();

  cloud.add(material.uniforms.u_scale, "value", 0, 2, 0.01).name("Size1");
  cloud.add(material.uniforms.u_scale2, "value", 0, 2, 0.01).name("Size2");
  cloud.add(material.uniforms.u_iters, "value", 0, 10, 1).name("Iter");
  cloud.add(material.uniforms.u_speed, "value", 0, 5, 0.01).name("Speed");
  cloud.add(material.uniforms.u_brightness, "value", 0, 1, 0.01).name("Brightness");
  addColor(cloud, material.uniforms.u_color1, "Density");
  addColor(cloud, material.uniforms.u_fog_color, "Fog");
  //non-uniforms
  //cloud.add(settings, "parallaxVal", 0, 5, 1).name("Parallax");
  cloud.add(material.uniforms.u_fog, "value").name("Show Fog");
  cloud.add(settings, "mouse").name("Mouse");

  perf.add(settings, "fps", 18, 60, 6).name("FPS");
  let tempScale = { value: settings.scale }; //don't update global value
  perf
    .add(tempScale, "value", 0.1, 2, 0.01)
    .name("Display")
    .onChange(function () {
      setScale(tempScale.value);
    });

  misc
    .add(
      {
        lively: function () {
          window.open("https://www.rocksdanister.com/lively");
        },
      },
      "lively"
    )
    .name("Try It On Your Desktop!");
  misc
    .add(
      {
        source: function () {
          window.open("https://github.com/rocksdanister/clouds");
        },
      },
      "source"
    )
    .name("Source Code");
  gui.close();
}

//datgui threejs color menu
function addColor(ui, property, displayName) {
  var conf = { color: property.value.getHex() };
  ui.addColor(conf, "color")
    .onChange(function (val) {
      property.value = new THREE.Color(val);
    })
    .name(displayName);
}
