﻿
namespace Wheel.Scripts {

    enum WheelState {

        Idle = 0,
        Start = 1,
        AccelerateStart = 2,
        AccelerateRunning = 3,
        SpinNormalStart = 4,
        SpinNormalRunning = 5,
        DeccelerateStart = 6,
        DeccelerateRunning = 7,
        StopStart = 8,
        StopRunning = 9
    }

    export class WheelScript {

        private TWO_PI: number = 2.0 * Math.PI;

        private _confVelocity: number = Math.PI * 2.0;
	    private _confStopDistance: number = this.TWO_PI * 2.0;
        private _confAccelerationTime: number = 0.5;
        private _confConstantVelocityTime: number = 2.5;

        private _isRunning: boolean;
        private _angle: number;
        private _velocity: number;
        private _d0: number;
        private _acceleration: number;
        private _runningTime: number;
        private _wheelState: WheelState;
        private _stopAtAngle: number;
        private _displacementToStop: number;
        private _displacement: number;

        constructor() {
            
            this._wheelState = WheelState.Idle;
            this._isRunning = false;
            this.resetState();
        }

        private resetState() {
            this._angle = 0.0;
            this._velocity = 0.0;
            this._acceleration = 0.0;
        }

        getAngle(): number {

            return this._angle;
        }

        getVelocity(): number {

            return this._velocity;
        }

        get isRunning(): boolean {

            return this._isRunning;
        }

        start(stopAtAngle: number) {

            if (this._wheelState != WheelState.Idle) {
                console.error("Wheel is running!");
                return;
            }

            this._isRunning = true;
            this._stopAtAngle = stopAtAngle;
            this._wheelState = WheelState.Start;
        }

        update(dt: number) {

            if (!this._isRunning) return;

            this._d0 = (this._velocity * dt);
            this._angle = (this._angle + this._d0 + 0.5 * this._acceleration * dt * dt) % this.TWO_PI;
            this._velocity += this._acceleration * dt;

            switch (this._wheelState) {
                case WheelState.Idle:
                    break;
                case WheelState.Start:
                    {
                        this._wheelState = WheelState.AccelerateStart;
                        console.info("==>");
                        console.info("Starting from angle: " + this._angle + ", stopping at: " + this._stopAtAngle);
                    }
                    break;
                case WheelState.AccelerateStart:
                    {
                        this._runningTime = 0.0;
                        this._acceleration = this._confVelocity / this._confAccelerationTime;
                        this._wheelState = WheelState.AccelerateRunning;
                    }
                    break;
                case WheelState.AccelerateRunning:
                    {
                        this._runningTime += dt;
                        if (this._velocity >= this._confVelocity) {
                            this._acceleration = 0.0;
                            this._wheelState = WheelState.SpinNormalStart;
                        }
                    }
                    break;
                case WheelState.SpinNormalStart:
                    {
                        this._runningTime = 0.0;
                        this._wheelState = WheelState.SpinNormalRunning;
                    }
                    break;
                case WheelState.SpinNormalRunning:
                    {
                        this._runningTime += dt;

                        let thetaInitial = (this._stopAtAngle - this._confStopDistance) % this.TWO_PI;
                        if (thetaInitial < 0) thetaInitial += this.TWO_PI;

                        let nextAngle = (this._angle + this._d0) % this.TWO_PI;
                        if (this._runningTime >= this._confConstantVelocityTime &&
                            nextAngle > thetaInitial &&
                            this._angle <= thetaInitial) {
                            console.log("preparing to deccelerate from angle: " + this._angle);
                            this._displacementToStop = this._confStopDistance;
                            this._acceleration = 0.0;
                            this._wheelState = WheelState.DeccelerateStart;
                        }
                    }
                    break;
                case WheelState.DeccelerateStart:
                    {
                        this._runningTime = 0.0;
                        this._displacement = 0.0;

                        console.info("displacement to stop: " + this._displacementToStop);
                        this._acceleration = -(this._velocity * this._velocity) / (2.0 * this._displacementToStop);

                        this._wheelState = WheelState.DeccelerateRunning;
                    }
                    break;
                case WheelState.DeccelerateRunning:
                    {
                        this._runningTime += dt;
                        this._displacement += (this._d0);

                        let next = this._displacement + (this._velocity * dt) + (0.5 * this._acceleration * dt * dt);
                        if (next >= this._displacementToStop) {
                            // if on the next frame we are going to be on target or a bit over.
                            // we just want to make sure we translate by a delta amount that lands us
                            // in the correct place. 
                            this._acceleration = 0.0;
                            this._velocity = 0.0;
                            this._wheelState = WheelState.StopStart;
                        }                        
                    }
                    break;
                case WheelState.StopStart:
                    {                        
                        console.log("<<");
                        console.log("Stopped at angle: " + this._angle);
                        console.log("Desired stop: " + this._stopAtAngle);
                        console.log("Running time: " + this._runningTime);

                        let delta0 = this.toDeg(this._stopAtAngle - this._angle);
                        if (delta0 > 0) {
                            console.info("Sim landed before target");
                        } else if (delta0 < 0) {
                            console.info("Sim landed after target");
                        } else {
                            console.info("Sim landed ON target");
                        }

                        if (delta0 <= 2.0) {
                            console.info("Sim landed within threshold");
                        } else {
                            console.info("Sim landed outside threshold");
                        } 

                        this._runningTime = 0.0;
                        this._wheelState = WheelState.StopRunning;
                    }
                    break;
                case WheelState.StopRunning:
                    {
                        this._runningTime += dt;

                        this._acceleration = 0.0;
                        this._velocity = 0.0;
                        this._angle = this._stopAtAngle;
                        this._wheelState = WheelState.Idle;
                        this._isRunning = false;
                    }
                    break;
            }
        }

        private toDeg(rad: number): number {

            return rad * 180.0 / Math.PI;
        }
    }

}