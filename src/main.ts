import "./style.css";
import rockImg from "./rock.svg";
import paperImg from "./paper.svg";
import scissorsImg from "./scissors.svg";
import { Recorder, RecorderStatus } from "canvas-record";
import createCanvasContext from "canvas-context";
import { AVC } from "media-codecs";

const rock = new Image();
rock.src = rockImg;
const paper = new Image();
paper.src = paperImg;
const scissors = new Image();
scissors.src = scissorsImg;

const width = 400;
const height = 400;
const { context: ctx, canvas } = createCanvasContext("2d", {
  width: width,
  height: height,
  contextAttributes: { willReadFrequently: true },
}) as {
  context: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
};

Object.assign(canvas.style, {
  width: `${width}px`,
  height: `${height}px`,
});

const containerElement = document.getElementById("canvas-container")!;
containerElement.appendChild(canvas as HTMLCanvasElement);

const canvasRecorder = new Recorder(ctx, {
  name: "canvas-recorder",
  encoderOptions: {
    codec: AVC.getCodec({ profile: "Main", level: "2.1" }),
  },
  frameRate: 60,
  duration: Infinity,
});

type Vec2 = [number, number];
type Element = "rock" | "paper" | "scissors";
type Entity = {
  pos: Vec2;
  vel: Vec2;
  element: Element;
};

const ENTITY_SIZE = 10;
const ENTITY_SPEED = 1;

const entities: Entity[] = [];
const entityByElement: Record<Element, Entity[]> = {
  rock: [],
  paper: [],
  scissors: [],
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function createEntity(pos: Vec2, direction: number, element: Element) {
  const speed = ENTITY_SPEED * (Math.random() * 0.5 + 0.5);
  const vel: Vec2 = [Math.cos(direction) * speed, Math.sin(direction) * speed];
  entities.push({ pos, vel, element });
  entityByElement[element].push(entities[entities.length - 1]);
}

function changeEntityElement(entity: Entity, element: Element) {
  const index = entityByElement[entity.element].indexOf(entity);
  entityByElement[entity.element].splice(index, 1);
  entity.element = element;
  entityByElement[element].push(entity);
}

function updateEntity(entity: Entity) {
  entity.pos[0] += entity.vel[0];
  entity.pos[1] += entity.vel[1];
  if (
    entity.pos[0] < ENTITY_SIZE ||
    entity.pos[0] > canvas.width - ENTITY_SIZE
  ) {
    entity.vel[0] *= -1;
    entity.pos[0] = clamp(
      entity.pos[0],
      ENTITY_SIZE,
      canvas.width - ENTITY_SIZE
    );
  }
  if (
    entity.pos[1] < ENTITY_SIZE ||
    entity.pos[1] > canvas.height - ENTITY_SIZE
  ) {
    entity.vel[1] *= -1;
    entity.pos[1] = clamp(
      entity.pos[1],
      ENTITY_SIZE,
      canvas.height - ENTITY_SIZE
    );
  }
}

function checkCollision(entity: Entity) {
  const enemyElement =
    entity.element === "rock"
      ? "paper"
      : entity.element === "paper"
      ? "scissors"
      : "rock";
  const enemies = entityByElement[enemyElement];
  for (const enemy of enemies) {
    if (
      Math.hypot(entity.pos[0] - enemy.pos[0], entity.pos[1] - enemy.pos[1]) <
      ENTITY_SIZE * 2
    ) {
      changeEntityElement(entity, enemy.element);
      break;
    }
  }
}

function drawEntity(entity: Entity) {
  const image =
    entity.element === "rock"
      ? rock
      : entity.element === "paper"
      ? paper
      : scissors;
  ctx.drawImage(
    image,
    entity.pos[0] - ENTITY_SIZE,
    entity.pos[1] - ENTITY_SIZE,
    ENTITY_SIZE * 2,
    ENTITY_SIZE * 2
  );
}

function generateEntities(
  around: Vec2,
  spread: number,
  count: number,
  element: Element
) {
  for (let i = 0; i < count; i++) {
    const direction = Math.random() * Math.PI * 2;
    const s = Math.random() * spread;
    const pos: Vec2 = [
      around[0] + Math.cos(direction) * s,
      around[1] + Math.sin(direction) * s,
    ];
    createEntity(pos, direction, element);
  }
}

const COUNT = 50;
const SPREAD = 50;

generateEntities([canvas.width / 4, canvas.height / 3], SPREAD, COUNT, "rock");
generateEntities(
  [canvas.width / 2, (canvas.height / 3) * 2],
  SPREAD,
  COUNT,
  "paper"
);
generateEntities(
  [(canvas.width / 4) * 3, canvas.height / 3],
  SPREAD,
  COUNT,
  "scissors"
);

function update() {
  for (const entity of entities) {
    updateEntity(entity);
    checkCollision(entity);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const entity of entities) {
    drawEntity(entity);
  }
}

let timeWhenDone = 0;

async function loop() {
  update();
  draw();

  if (canvasRecorder.status !== RecorderStatus.Recording) {
    requestAnimationFrame(loop);
    return;
  }

  await canvasRecorder.step();
  requestAnimationFrame(loop);

  let elementsLeft = 3;
  if (entityByElement.rock.length === 0) {
    elementsLeft--;
  }
  if (entityByElement.paper.length === 0) {
    elementsLeft--;
  }
  if (entityByElement.scissors.length === 0) {
    elementsLeft--;
  }

  if (elementsLeft <= 1) {
    if (timeWhenDone === 0) {
      timeWhenDone = performance.now();
    } else if (performance.now() - timeWhenDone > 1000) {
      canvasRecorder.stop();
    }
  }
}

canvas.addEventListener("click", (event) => {
  const element =
    Math.random() < 1 / 3 ? "rock" : Math.random() < 0.5 ? "paper" : "scissors";
  createEntity(
    [event.offsetX, event.offsetY],
    Math.random() * Math.PI * 2,
    element
  );
});

document.getElementById("start-recording")!.addEventListener("click", () => {
  canvasRecorder.start();
  loop();
});
