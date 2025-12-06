/**
 * Fraction utility class to replicate Python's fractions.Fraction behavior.
 * Handles automatic simplification and basic arithmetic operations.
 */
export class Fraction {
    public numerator: number;
    public denominator: number;

    constructor(numerator: number, denominator: number = 1) {
        if (denominator === 0) {
            throw new Error("Denominator cannot be zero.");
        }

        // Handle negative denominator
        if (denominator < 0) {
            numerator = -numerator;
            denominator = -denominator;
        }

        const common = this.gcd(Math.abs(numerator), Math.abs(denominator));
        this.numerator = numerator / common;
        this.denominator = denominator / common;
    }

    private gcd(a: number, b: number): number {
        return b === 0 ? a : this.gcd(b, a % b);
    }

    public add(other: Fraction | number): Fraction {
        const b = other instanceof Fraction ? other : new Fraction(other);
        return new Fraction(
            this.numerator * b.denominator + b.numerator * this.denominator,
            this.denominator * b.denominator
        );
    }

    public sub(other: Fraction | number): Fraction {
        const b = other instanceof Fraction ? other : new Fraction(other);
        return new Fraction(
            this.numerator * b.denominator - b.numerator * this.denominator,
            this.denominator * b.denominator
        );
    }

    public mul(other: Fraction | number): Fraction {
        const b = other instanceof Fraction ? other : new Fraction(other);
        return new Fraction(
            this.numerator * b.numerator,
            this.denominator * b.denominator
        );
    }

    public div(other: Fraction | number): Fraction {
        const b = other instanceof Fraction ? other : new Fraction(other);
        if (b.numerator === 0) throw new Error("Division by zero.");
        return new Fraction(
            this.numerator * b.denominator,
            this.denominator * b.numerator
        );
    }

    public toString(): string {
        return this.denominator === 1 ? `${this.numerator}` : `${this.numerator}/${this.denominator}`;
    }

    public toLatex(): string {
        return this.denominator === 1 ? `${this.numerator}` : `\\frac{${this.numerator}}{${this.denominator}}`;
    }

    public equals(other: Fraction | number): boolean {
        const b = other instanceof Fraction ? other : new Fraction(other);
        return this.numerator === b.numerator && this.denominator === b.denominator;
    }
}
