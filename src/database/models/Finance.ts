import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export class Transaction extends Model {
    static table = 'transactions';

    @text('name') name!: string;
    @field('amount') amount!: number;
    @text('date') date!: string;
    @text('icon') icon!: string;
    @text('type') type!: string;
    @text('category') category!: string;
}

export class Budget extends Model {
    static table = 'budgets';

    @text('category') category!: string;
    @field('amount') amount!: number;
    @text('month') month!: string;
}
