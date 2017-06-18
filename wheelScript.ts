
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

        private _confVelocity: number = Math.PI * 1.5;
        private _confT1: number = 0.5;
        private _confT2: number = 2.5;
        private _confT3: number = 1.0;

        private _isRunning: boolean;
        private _angle: number;
        private _velocity: number;
        private _d0: number;
        private _d0Step: number;
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

            this._d0 = (this._velocity * dt); // every step advances about 3 degrees
            this._angle = (this._angle + this._d0) % this.TWO_PI;
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
                        this._acceleration = this._confVelocity / this._confT1;
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
                        if (this._runningTime >= this._confT2) {
                            this._d0Step = this._d0;
                            console.log("preparing to deccelerate, step angle: " + this._d0Step * (180.0 / Math.PI));
                            this._acceleration = 0.0;
                            this._wheelState = WheelState.DeccelerateStart;
                        }
                    }
                    break;
                case WheelState.DeccelerateStart:
                    {
                        this._runningTime = 0.0;
                        this._displacement = 0.0;

                        let d0 = (this._stopAtAngle - this._angle);
                        if (d0 < 0) d0 = this.TWO_PI + d0;

                        this._displacementToStop = d0 + this.TWO_PI;

                        console.info("displacement to stop: " + this._displacementToStop);
                        this._acceleration = -(this._velocity * this._velocity) / (2.0 * this._displacementToStop);

                        this._wheelState = WheelState.DeccelerateRunning;
                    }
                    break;
                case WheelState.DeccelerateRunning:
                    {
                        this._runningTime += dt;
                        this._displacement += (this._d0);

                        if (this._velocity <= 0.0 /*this._displacement + this._d0Step >= this._displacementToStop*/) {
                            // + this._d0Step because we want to be below target angle, not over.
                            // this way, we can just translate to the correct angle without changing
                            // spin direction. Doing so would cause a visual artifact.
                            this._acceleration = 0.0;
                            this._velocity = 0.0;
                            this._wheelState = WheelState.StopStart;
                        }
                    }
                    break;
                case WheelState.StopStart:
                    {
                        let delta0 = (this._stopAtAngle - this._angle) * (180.0 / Math.PI);
                        console.info("*Stopped at rad: " + this._stopAtAngle + ", actual rad: " + this._angle + " delta deg: " + delta0 + " stopping time: " + this._runningTime);

                        this._runningTime = 0.0;
                        this._wheelState = WheelState.StopRunning;
                    }
                    break;
                case WheelState.StopRunning:
                    {
                        this._isRunning = false;
                        this._runningTime += dt;
                        this._wheelState = WheelState.Idle;

                        let delta0 = (this._stopAtAngle - this._angle) * (180.0 / Math.PI);
                        if (Math.abs(delta0) > 2.0) {
                            console.info("Sim landed " + ((delta0 < 0) ? "past" : "below") + " target");
                        } else {
                            console.info("Sim landed within threshold");
                        }
                        // we can just translate now if we have any remaining d0
                        this._angle = this._stopAtAngle;
                    }
                    break;
            }
        }

    }

}