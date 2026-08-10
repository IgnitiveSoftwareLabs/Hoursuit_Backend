import { Request, Response, NextFunction } from "express";

import { normalizeOptionalNumber } from "../utils/normalizeOptionalNumber";
import Godown from "../modals/masters/godown/godown";
import Stack from "../modals/masters/stack/stack";

const getField = (source: any, camel: string, snake: string) => {
    if (source && typeof source === "object") {
        if (source[camel] !== undefined) return source[camel];
        if (source[snake] !== undefined) return source[snake];
    }
    return undefined;
};

const isPositiveInteger = (value: unknown): value is number => {
    if (value === null || value === undefined || value === "") return false;
    const numberValue = Number(value);
    return Number.isInteger(numberValue) && numberValue > 0;
};

const parseJsonIfString = (value: any) => {
    if (typeof value === "string") {
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }
    return value;
};

const validateGodownStack = async (req: Request, res: Response, next: NextFunction) => {
    const header = parseJsonIfString(req.body.header);
    const lineItems = parseJsonIfString(req.body.lineItems);

    const items: Array<{
        location: string;
        warehouseId: number | null;
        godownId: number | null;
        stackId: number | null;
    }> = [];

    if (header && typeof header === "object") {
        items.push({
            location: "header",
            warehouseId: normalizeOptionalNumber(getField(header, "warehouseId", "warehouse_id")),
            godownId: normalizeOptionalNumber(getField(header, "godownId", "godown_id")),
            stackId: normalizeOptionalNumber(getField(header, "stackId", "stack_id")),
        });
    }

    if (Array.isArray(lineItems)) {
        for (let index = 0; index < lineItems.length; index += 1) {
            const lineItem = parseJsonIfString(lineItems[index]);
            if (lineItem && typeof lineItem === "object") {
                items.push({
                    location: `line item ${index + 1}`,
                    warehouseId: normalizeOptionalNumber(getField(lineItem, "warehouseId", "warehouse_id")),
                    godownId: normalizeOptionalNumber(getField(lineItem, "godownId", "godown_id")),
                    stackId: normalizeOptionalNumber(getField(lineItem, "stackId", "stack_id")),
                });
            }
        }
    }

    if (items.length === 0) {
        return next();
    }

    const godownIds = new Set<number>();
    const stackIds = new Set<number>();

    for (const item of items) {
        if (!item.warehouseId) {
            return res.status(400).json({
                success: false,
                message: `${item.location}: warehouseId is required`,
            });
        }

        if (item.godownId !== null && item.godownId !== undefined && item.godownId !== 0) {
            if (!isPositiveInteger(item.godownId)) {
                return res.status(400).json({
                    success: false,
                    message: `${item.location}: godownId must be a positive integer`,
                });
            }
            godownIds.add(item.godownId);
        }

        if (item.stackId !== null && item.stackId !== undefined && item.stackId !== 0) {
            if (!isPositiveInteger(item.stackId)) {
                return res.status(400).json({
                    success: false,
                    message: `${item.location}: stackId must be a positive integer`,
                });
            }
            stackIds.add(item.stackId);
        }
    }

    const [godowns, stacks] = await Promise.all([
        godownIds.size > 0 ? Godown.findAll({ where: { id: Array.from(godownIds) } }) : Promise.resolve([] as Godown[]),
        stackIds.size > 0 ? Stack.findAll({ where: { id: Array.from(stackIds) } }) : Promise.resolve([] as Stack[]),
    ]);

    const godownMap = new Map<number, Godown>(godowns.map((godown) => [godown.id, godown]));
    const stackMap = new Map<number, Stack>(stacks.map((stack) => [stack.id, stack]));

    const neededGodownIdsFromStacks = new Set<number>();

    for (const item of items) {
        if (item.godownId !== null && item.godownId !== undefined && item.godownId !== 0) {
            const godown = godownMap.get(item.godownId);
            if (!godown) {
                return res.status(400).json({
                    success: false,
                    message: `${item.location}: godownId ${item.godownId} does not exist`,
                });
            }
            if (godown.WarehouseId && item.warehouseId !== godown.WarehouseId) {
                return res.status(400).json({
                    success: false,
                    message: `${item.location}: godownId ${item.godownId} does not belong to warehouseId ${item.warehouseId}`,
                });
            }
        }

        if (item.stackId !== null && item.stackId !== undefined && item.stackId !== 0) {
            const stack = stackMap.get(item.stackId);
            if (!stack) {
                return res.status(400).json({
                    success: false,
                    message: `${item.location}: stackId ${item.stackId} does not exist`,
                });
            }
            if (item.godownId !== null && item.godownId !== undefined && item.godownId !== 0 && stack.GodownId !== item.godownId) {
                return res.status(400).json({
                    success: false,
                    message: `${item.location}: stackId ${item.stackId} does not belong to godownId ${item.godownId}`,
                });
            }
            if (!item.godownId) {
                neededGodownIdsFromStacks.add(stack.GodownId);
            }
        }
    }

    if (neededGodownIdsFromStacks.size > 0) {
        const neededGodowns = await Godown.findAll({ where: { id: Array.from(neededGodownIdsFromStacks) } });
        const neededGodownMap = new Map<number, Godown>(neededGodowns.map((godown) => [godown.id, godown]));

        for (const item of items) {
            if (item.stackId !== null && item.stackId !== undefined && item.stackId !== 0) {
                const stack = stackMap.get(item.stackId)!;
                const stackGodown = neededGodownMap.get(stack.GodownId);
                if (!stackGodown) {
                    return res.status(400).json({
                        success: false,
                        message: `${item.location}: stackId ${item.stackId} is linked to missing godown`,
                    });
                }
                if (item.warehouseId && stackGodown.WarehouseId && item.warehouseId !== stackGodown.WarehouseId) {
                    return res.status(400).json({
                        success: false,
                        message: `${item.location}: stackId ${item.stackId} does not belong to warehouseId ${item.warehouseId}`,
                    });
                }
            }
        }
    }

    return next();
};

export default validateGodownStack;