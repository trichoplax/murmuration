'use strict';
const global = this
document.addEventListener(
    "DOMContentLoaded",
    start
)

const config = {
    populationSize : 2000,  // creatures
    delay : 10,  // milliseconds
    canvasId : "flock_canvas",
    radius : 5,  // pixels (size of creatures)
    sightRadius : 25,  // pixels (how far creatures can see)
    minSpeed : 1,
    maxSpeed : 8,
    speedVaryingRate : 0.1,
    rotationRate : 0.16,
    repulsionRate : 1,
    viewProportion : .66,
    sideLength: 25,  // pixels (for acceleration grid cells)
    visualDebugging: false,  // Show workings visually.
}

function start() {
	global.flockCanvas = document.getElementById(
	    config.canvasId
	)
	
	global.flockContext = flockCanvas.getContext(
	    "2d"
	)
	
	fitCanvasToWindow()
	
	global.mouse_x = flockCanvas.width / 2
	global.mouse_y = flockCanvas.height / 2
	
    const accelerationGrid = new AccelerationGrid()
    const population = []
    
    for (let i = 0; i < config.populationSize; ++i) {
        const x = Math.random() * flockCanvas.width
        const y = Math.random() * flockCanvas.height
        const angle = Math.random() * 2 * Math.PI
        const speed = 0
        
        const creature = new Creature(
            x,
            y,
            angle,
            speed,
            accelerationGrid
        )
        
        population.push(
            creature
        )
        
        if (
            !config.firstCreature
        ) {
            config.firstCreature = creature
        }
    }
    
    global.simulation = new Simulation(
        accelerationGrid,
        population,
        config.delay,
        flockCanvas,
        flockContext
    )
    
	flockCanvas.addEventListener(
	    "mousemove",
	    whenMouseMoves
	)
	
	window.addEventListener(
	    "resize",
	    debounce(
	        whenWindowResizes,
	        1000
	    )
	)
	
	simulation.onResize()
    
    simulation.play()
}

class Simulation {
    constructor(
        accelerationGrid,
        population,
        delay,
        canvas,
        drawingContext
    ) {
        this.accelerationGrid = accelerationGrid
        this.population = population
        this.delay = delay
        this.canvas = canvas
        this.drawingContext = drawingContext
        
        this.accelerationGrid.initialiseCells(
            this.population,
            this.canvas
        )
        
        this.play = this.play.bind(
            this
        )
    }
    
    play() {
        this.eraseCreatures()
        this.planMoves()
        this.makeMoves()
        this.drawCreatures()
        
        setTimeout(
            this.play,
            this.delay
        )
    }
        
    eraseCreatures() {
        for (
            const creature of this.population
        ) {
            creature.erase()
        }
        flockContext.fillStyle = 'rgba(255, 255, 255, 0.2)'
        flockContext.fillRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        )
    }
    
    planMoves() {
        for (
            const creature of this.population
        ) {
            creature.planMove()
        }
    }
    
    makeMoves() {
        for (
            const creature of this.population
        ) {
            creature.makeMove()
        }
    }
    
    drawCreatures() {
    	flockContext.fillStyle = 'black'
        for (
            const creature of this.population
        ) {
            if (
                config.visualDebugging
            ) {
                if (
                    config.firstCreature === creature
                ) {
                    flockContext.fillStyle = 'red'
                    flockContext.strokeStyle = 'blue'
                    flockContext.beginPath()
                    flockContext.arc(
                        creature.x,
                        creature.y,
                        config.sightRadius,
                        0,
                        Math.PI * 2
                    )
                    flockContext.stroke()               
                } else {
            	    flockContext.fillStyle = 'black'
            	}
            }
            creature.draw()
        }
    }
    
    onResize() {
        this.accelerationGrid.initialiseCells(
            this.population,
            this.canvas
        )
    }
}

class AccelerationGrid {
    constructor() {
        this.cells = []
        this.width = 0
        this.height = 0
        this.cellOffsets = []
        
        const maxCellDistance = Math.ceil(
            config.sightRadius / config.sideLength
        )
        
        const vertices = []
        
        for (
            let xVertex = -1;
            xVertex <= 1;
            xVertex++
        ) {
            for (
                let yVertex = -1;
                yVertex <= 1;
                yVertex++
            ) {
                vertices.push(
                    {
                        x : xVertex,
                        y : yVertex,
                    }
                )
            }
        }
        
        for (
            let x = -maxCellDistance;
            x <= maxCellDistance;
            x++
        ) {
            for (
                let y = -maxCellDistance;
                y <= maxCellDistance;
                y++
            ) {
                for (
                    const vertex of vertices
                ) {
                    if (
                        this.inRange(
                            (x + vertex.x) * config.sideLength,
                            (y + vertex.y) * config.sideLength
                        )
                    ) {
                        this.cellOffsets.push(
                            {
                                x: x,
                                y: y,
                            }
                        )
                        
                        break
                    }
                }
            }
        }
    }
    
    initialiseCells(
        population,
        canvas     
    ) {
        this.cells = []
        this.width = Math.ceil(
            canvas.width / config.sideLength
        )
        
        this.height = Math.ceil(
            canvas.height / config.sideLength
        )
        
        for (
            let x = 0;
            x < this.width;
            x++
        ) {            
            this.cells.push(
                []
            )
            
            for (
                let y = 0;
                y < this.height;
                y++
            ) {                
                this.cells[x].push(
                    new Set()
                )                
            }
        }
        
        for (
            const creature of population
        ) {        
            this.add(
                creature
            )            
        }
    }
    
    inRange(
        x,
        y
    ) {
        if (
            x ** 2 + y ** 2 <= config.sightRadius ** 2
        ) {
            return true
        }        
    }
    
    add(
        creature
    ) {  // Based on planned x and y.
        const x = Math.floor(
            creature.plannedX / config.sideLength
        )
        
        const y = Math.floor(
            creature.plannedY / config.sideLength
        )
        
        if (
            this.withinBounds(
                x,
                y
            )            
        ) {
            this.cells[x][y].add(
                creature
            )
        }
    }
    
    remove(
        creature
    ) {  // Based on current x and y.
        const x = Math.floor(
            creature.x / config.sideLength
        )
        
        const y = Math.floor(
            creature.y / config.sideLength
        )
        
        if (
            this.withinBounds(
                x,
                y
            )            
        ) {
            this.cells[x][y].delete(
                creature
            )
        }    
    }
    
    nearbyCreatures(
        creature
    ) {
        const x = Math.floor(
            creature.x / config.sideLength
        )
        
        const y = Math.floor(
            creature.y / config.sideLength
        )
        
        const creatures = []
        
        for (
            const offset of this.cellOffsets
        ) {
            const cell = {
                x : x + offset.x,
                y : y + offset.y,
            }
            if (
                this.withinBounds(
                    cell.x,
                    cell.y
                )
            ) {
                if (
                    config.visualDebugging &&
                    creature === config.firstCreature
                ) {
                    this.visualise(cell)
                }
                
                for (
                    const other of this.cells[cell.x][cell.y]
                ) {
                    if (
                        other !== creature &&
                        this.inRange(
                            other.x - creature.x,
                            other.y - creature.y,
                        )
                    ) {
                        creatures.push(
                            other
                        )
                        if (
                            config.visualDebugging &&
                            creature === config.firstCreature
                        ) {
                            this.highlight(
                                other
                            )
                        }                      
                    }
                }
            }
        }
        
        return creatures    
    }
    
    visualise(
        cell
    ) {
        const x = cell.x * config.sideLength
        const y = cell.y * config.sideLength
        
        flockContext.fillStyle = 'rgba(64, 0, 64, 0.1)'
		flockContext.beginPath()
		flockContext.moveTo(
		    x,
		    y
		)
		flockContext.lineTo(
		    x,
		    y + config.sideLength
		)
		flockContext.lineTo(
		    x + config.sideLength,
		    y + config.sideLength
		)
		flockContext.lineTo(
		    x + config.sideLength,
		    y
		)
		flockContext.fill()
        
    }
    
    highlight(
        creature
    ) {
        const x = creature.x
        const y = creature.y
        
        flockContext.fillStyle = 'rgba(0, 255, 0, 1)'
        flockContext.beginPath()
        flockContext.arc(
            x,
            y,
            config.radius,
            0,
            Math.PI * 2
        )
        flockContext.fill()
    }
    
    update(
        creature
    ) {
        if (
            this.crossedBoundary(
                creature
            )
        ) {
            this.remove(
                creature
            )
            
            this.add(
                creature
            )
        }
    }
    
    crossedBoundary(
        creature
    ) {
        const plannedCell = {
            x : Math.floor(
                creature.plannedX / config.sideLength
            ),            
            y : Math.floor(
                creature.plannedY / config.sideLength
            )
        }
        
        const currentCell = {
            x : Math.floor(
                creature.x / config.sideLength
            ),            
            y : Math.floor(
                creature.y / config.sideLength
            )
        }
        
        if (
            plannedCell != currentCell
        ) {
            return true
        }
    }
    
    withinBounds(
        x,
        y
    ) {
        if (
            x >= 0 &&
            y >= 0 &&
            x < this.width &&
            y < this.height
        ) {
            return true
        }
    }
}

class Creature {
	constructor(
	    x,
	    y,
	    angle,
	    speed,
	    accelerationGrid
	) {
		this.x = x
		this.y = y
		this.plannedX = x
		this.plannedY = y
		this.angle = angle
		this.speed = speed
		this.accelerationGrid = accelerationGrid
		
		this.accelerationGrid.add(
		    this
		)
	}

	erase() {
		const red = Math.floor(
		    Math.max(
		        Math.min(
		            this.speed * 80 + 50,
		            200
		        ),
		        0
		    )
		)
		
		const green = Math.floor(
		    Math.max(
		        Math.min(
		            this.speed * 40 - 80,
		            255
		        ),
		        0
		    )
		)
		
		const blue = Math.floor(
		    Math.max(
    		    Math.min(
	    	        this.speed * 60 + 60,
	    	        255
	    	    ),
	    	    0
	    	)
		)
		
		flockContext.fillStyle = 'rgb(' + red + ',' + green + ',' + blue + ')'
		this.draw()
	}

	planMove() {
	    this.plannedX = this.x
	    this.plannedY = this.y
	    this.plannedAngle = this.angle
	    this.angleChange = 0
	    this.plannedSpeed = this.speed
	    this.speedChange = 0
	
        const clearOfMouse = this.avoidMouse(
            mouse_x,
            mouse_y
        )
        
        const clearOfBoundaries = this.avoidBoundaries()
        
        this.repelFrom(
            mouse_x,
            mouse_y
        )
        
        const neighbours = this.accelerationGrid.nearbyCreatures(
            this
        )
        
        for (
            const other of neighbours
        ) {
		    if (
		        other !== this
		    ) {				    
			    this.repelFrom(
			        other.x,
			        other.y
			    )				 
		    }        
        }
        
        let clearOfCreatures = true
        
        if (
            clearOfMouse &&
            clearOfBoundaries
        ) {
            for (
                const other of neighbours
            ) {
		        if (
		            other !== this
		        ) {    			    
		            if (
		                this.sees(
		                    other
		                )
		            ) {
			            const clearOfCreature = this.avoidCreature(
			                other.x,
			                other.y
			            )
			            
			            if (!clearOfCreature) {
			                clearOfCreatures = false
			            }
			        }			 
		        }        
            }
            
            if (
                clearOfCreatures
            ) {
                for (
                    const other of neighbours
                ) {
		            if (
		                other !== this
		            ) {    			    
		                if (
		                    this.sees(
		                        other
		                    )
		                ) {
		                    this.headFor(
			                    other.x,
			                    other.y
			                )
			                
			                this.alignWith(
			                    other.angle
			                )
			                
			                this.matchSpeed(
			                    other.speed
			                )
			            }				 
		            }        
                }
            }
        }
        

        this.varySpeed()
        this.varyAngle()
        
	    const sizeOfChange = Math.min(
	        Math.abs(
	            this.speedChange
	        ),
	        config.speedVaryingRate
	    )
	    
		this.speedChange = Math.sign(
		    this.speedChange
		) * sizeOfChange
        
        this.plannedSpeed += this.speedChange
        
        this.plannedSpeed = Math.min(
            this.plannedSpeed,
            config.maxSpeed
        )
        
        this.plannedSpeed = Math.max(
            this.plannedSpeed,
            config.minSpeed
        )
        
        const angleSign = Math.sign(this.angleChange)
        const absoluteAngleChange = Math.abs(this.angleChange)
        const cappedAngleChange = Math.min(
            absoluteAngleChange,
            config.rotationRate
        )
        this.plannedAngle = this.angle + cappedAngleChange * angleSign       
    
	    if (
	        this.plannedAngle < -Math.PI
	    ) {
		    this.plannedAngle += 2 * Math.PI
	    }
	    if (
	        this.plannedAngle > Math.PI
	    ) {
		    this.plannedAngle -= 2 * Math.PI
	    }

		this.plannedX += Math.cos(
		    this.angle
		) * this.speed
		
		this.plannedY += Math.sin(
		    this.angle
		) * this.speed
	}
	
	makeMove() {
	    this.accelerationGrid.update(
	        this
	    )
	    
	    this.x = this.plannedX
	    this.y = this.plannedY
	    this.angle = this.plannedAngle
	    this.speed = this.plannedSpeed	
	}

    sees(
        other
    ) {
		const x_difference = other.x - this.x
		const y_difference = other.y - this.y
		const distance_squared = x_difference ** 2 + y_difference ** 2

		const target_chaser_angle = Math.atan2(
		    y_difference,
		    x_difference
		)
		
		let relative_angle = target_chaser_angle - this.angle
		
	    if (
	        relative_angle < -Math.PI
	    ) {
		    relative_angle += 2 * Math.PI
	    }
	    
	    if (
	        relative_angle > Math.PI
	    ) {
		    relative_angle -= 2 * Math.PI
	    }
	    
		return (
		    relative_angle > -Math.PI * config.viewProportion
		    && relative_angle < Math.PI * config.viewProportion
		    && distance_squared < 10000
		)
    }
    
    avoidBoundaries() {
        if (
            this.x < config.sightRadius
        ) {
            this.headFor(
                this.x + config.radius * 2,
                this.y
            )
        } else if (
            this.x > flockCanvas.width - config.sightRadius
        ) {
            this.headFor(
                this.x - config.radius * 2,
                this.y
            )
        } else if (
            this.y < config.sightRadius
        ) {
            this.headFor(
                this.x,
                this.y + config.radius * 2
            )
        } else if (
            this.y > flockCanvas.height - config.sightRadius
        ) {
            this.headFor(
                this.x,
                this.y - config.radius * 2
            )
        } else {
            return true
        }
    }
    
    avoidMouse(
        x,
        y
    ) {
		const x_difference = x - this.x
		const y_difference = y - this.y
		const distance_squared = x_difference ** 2 + y_difference ** 2
        
		if (
		    distance_squared < config.sightRadius ** 2
		) {
		    this.avoid(x, y)
		    this.speedChange += config.speedVaryingRate
		} else {
		    return true
		}
    }
    
    avoidCreature(
        x,
        y
    ) {
		const x_difference = x - this.x
		const y_difference = y - this.y
		const distance_squared = x_difference ** 2 + y_difference ** 2
        
		if (
		    distance_squared < (config.radius * 2) ** 2
		) {
		    this.avoid(x, y)
		} else {
		    return true
		}
    }
    
    matchSpeed(
        speed
    ) {
        const difference = speed - this.speed
        
	    const sizeOfChange = Math.min(
	        Math.abs(
	            difference
	        ) / 2,
	        config.speedVaryingRate
	    )
	    
		this.speedChange += Math.sign(
		    difference
		) * sizeOfChange
    }
    
    varySpeed() {
        this.speedChange += (
            Math.random() - 0.5
        )  * config.speedVaryingRate
    }
    
    varyAngle() {
        this.angleChange += (
            Math.random() - 0.5
        ) * config.rotationRate
    }
    
	headFor(
	    x,
	    y
	) {
		const x_difference = x - this.x
		const y_difference = y - this.y
		const distance_squared = x_difference ** 2 + y_difference ** 2
		
		
		if (
		    distance_squared > config.radius ** 2
		) {
	        const target_chaser_angle = Math.atan2(
	            y_difference,
	            x_difference
	        )
	        
	        this.alignWith(
	            target_chaser_angle,
	            x_difference,
	            y_difference
	        )
	    }
	}
	
	repelFrom(
	    x,
	    y
	) {
		const x_difference = x - this.x
		const y_difference = y - this.y
		const distance_squared = x_difference ** 2 + y_difference ** 2
		
		if (
		    distance_squared < config.radius ** 2
		) {
		    const target_chaser_angle = Math.atan2(
	            y_difference,
	            x_difference
	        )		
	    
	        this.plannedX -= Math.cos(
	            target_chaser_angle
	        ) * config.repulsionRate
	        
	        this.plannedY -= Math.sin(
	            target_chaser_angle
	        ) * config.repulsionRate
		}	        
	}
	
	alignWith(
	    angle
	) {
		const difference = angle - this.angle
			    
	    if (
	        Math.abs(
	            difference
	        ) < Math.PI
	    ) {
		    this.angleChange += Math.sign(
		        difference
		    ) * config.rotationRate
	    } else {
		    this.angleChange -= Math.sign(
		        difference
		    ) * config.rotationRate
	    }
	}

	avoid(
	    x,
	    y
	) {
	    const x_difference = x - this.x
	    const y_difference = y - this.y
    
        this.headFor(
            this.x - x_difference,
            this.y - y_difference
        )
	}

	draw() {
		const nose_x = this.x + Math.cos(
		    this.angle
		) * config.radius
		
		const nose_y = this.y + Math.sin(
		    this.angle
		) * config.radius
		
		const left_x = this.x + Math.cos(
		    this.angle + 2.5
		) * config.radius
		
		const left_y = this.y + Math.sin(
		    this.angle + 2.5
		) * config.radius
		
		const right_x = this.x + Math.cos(
		    this.angle - 2.5
		) * config.radius
		
		const right_y = this.y + Math.sin(
		    this.angle - 2.5
		) * config.radius
        
		flockContext.beginPath()
		
		flockContext.moveTo(
		    nose_x,
		    nose_y
		)
		
		flockContext.lineTo(
		    left_x,
		    left_y
		)
		
		flockContext.lineTo(
		    this.x,
		    this.y
		)
		
		flockContext.lineTo(
		    right_x,
		    right_y
		)
		
		flockContext.fill()
	}
}

function whenMouseMoves(
    event
) {	
	const mousePosition = getMousePosition(
	    event
	)
	
	mouse_x = mousePosition.x
	mouse_y = mousePosition.y
}

function getMousePosition(
    event
) {
    const target = event.currentTarget
    const rect = target.getBoundingClientRect();
    const clientWidth = rect.right - rect.left
    const clientHeight = rect.bottom - rect.top
    const x = (event.clientX - rect.left) / clientWidth * target.width
    const y = (event.clientY - rect.top) / clientHeight * target.height
    
    return {
        x : x,
        y : y,
    };
}

function whenWindowResizes(
    event
) {
    fitCanvasToWindow()
	simulation.onResize()
}

function fitCanvasToWindow() {
	flockCanvas.width = document.body.clientWidth
	flockCanvas.height = document.body.clientHeight    
}

function debounce(
    inputFunction,
    delay
) {
    let timerId = null
    return (
        ...argumentsToInputFunction
    ) => {
        if (
            timerId
        ) {
            clearTimeout(
                timerId
            )
        }
        timerId = setTimeout(
            () => {
                timerId = null
                inputFunction(
                    ...argumentsToInputFunction
                )
            },
            delay
        )
    }
}

