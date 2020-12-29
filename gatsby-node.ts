import { readFileSync } from "fs";
import path from "path";
import fetch from "isomorphic-fetch";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import ms from "ms";

dayjs.extend(duration);
dayjs.extend(relativeTime);

interface IGatsbyNodeSourceNodesArg {
    actions: {
        createNode: (values: {
            id: string;
            parent: string | null;
            children: [];
            internal: {
                type: string;
                contentDigest: string;
            };
            [key: string]: any;
        }) => any;
        createTypes: (value: string) => void;
    };
    createNodeId: (value: string) => string;
    createContentDigest: (value: any) => any;
}
type ITimeSpanValues = "7day" | "30day";
interface IGatsbyPluginValues {
    /**
     * Your WakaTime Secret API Key
     *
     * this can be obtained at: [wakatime.com/settings/account](https://wakatime.com/settings/account)
     */
    apiKey: string;
    baseURL: string;
    timespan: ITimeSpanValues;
}

interface IWakaTimeSummaryRecord {
    digital: string;
    hours: number;
    minutes: number;
    name: string;
    percent: number;
    seconds: number;
    text: string;
    total_seconds: number;
}
interface IWakaTimeDaySummaryRecord {
    categories: IWakaTimeSummaryRecord[];
    dependencies: IWakaTimeSummaryRecord[];
    editors: IWakaTimeSummaryRecord[];
    languages: IWakaTimeSummaryRecord[];
    machines: IWakaTimeSummaryRecord[];
    operating_systems: IWakaTimeSummaryRecord[];
    projects: IWakaTimeSummaryRecord[];
    grand_total: IWakaTimeSummaryRecord;
    range: {
        date: string;
        end: string;
        start: string;
        text: string;
        timezone: string;
    };
}
interface IWakaTimeSummaryResponse {
    error?: string;
    show_upgrade_modal?: boolean;
    data: IWakaTimeDaySummaryRecord[];
    end: string;
    start: string;
}

type IGatsbyNodeSourceNodes = (
    args: IGatsbyNodeSourceNodesArg,
    pluginOptions: IGatsbyPluginValues
) => void;
type IGatsbyNodeCreateSchemaCustomizations = (
    args: IGatsbyNodeSourceNodesArg,
    pluginOptions: IGatsbyPluginValues
) => void;

const onPreInit = () => {
    const pkgRaw = readFileSync(
        path.resolve(__dirname, "package.json"),
        "utf8"
    );
    const pkg = JSON.parse(pkgRaw);
    console.info(`Loaded ${pkg.name}:${pkg.version}`);
};

const SUMMARY_DATE_FORMAT = "YYYY-MM-DD";

const sourceNodes: IGatsbyNodeSourceNodes = async (
    { actions, createNodeId, createContentDigest },
    pluginOptions
) => {
    const { createNode } = actions;
    const options = Object.assign(
        {
            baseURL: "https://wakatime.com/api/v1",
            apiKey: "",
            timespan: "7day"
        },
        pluginOptions
    );

    const authorization = `Basic ${Buffer.from(pluginOptions.apiKey).toString(
        "base64"
    )}`;

    const dateDuration = dayjs.duration(ms(options.timespan));
    const startDate = dayjs()
        .subtract(dateDuration.asDays(), "day")
        .format(SUMMARY_DATE_FORMAT);
    const endDate = dayjs().format(SUMMARY_DATE_FORMAT);

    console.info(
        `Getting Information from WakaTime from ${startDate} to ${endDate}`
    );

    const summaries: IWakaTimeSummaryResponse = await fetch(
        options.baseURL +
            `/users/current/summaries?start=${startDate}&end=${endDate}`,
        {
            headers: {
                authorization
            }
        }
    ).then((response) => response.json());

    if (summaries.error) {
        throw new Error(summaries.error);
    }

    interface IWakaTimeSummarySum {
        [key: string]: {
            name: string;
            total_seconds: number;
        };
    }

    const compoundSummaries: {
        [key: string]: IWakaTimeSummarySum;
    } = {};

    const thisTypeBase = `WAKA_TIME_SUMMARY`;

    summaries.data.forEach((summary) => {
        const summaryKeys: (keyof typeof summary)[] = Object.keys(
            summary
        ) as (keyof typeof summary)[];

        summaryKeys.forEach((key) => {
            if (key === "grand_total") {
                return;
            }
            if (key === "range") {
                return;
            }

            if (!compoundSummaries[key]) {
                compoundSummaries[key] = {};
            }

            summary[key].forEach((record: IWakaTimeSummaryRecord) => {
                if (!compoundSummaries[key][record.name]) {
                    compoundSummaries[key][record.name] = {
                        name: record.name,
                        total_seconds: 0
                    };
                }
                compoundSummaries[key][record.name].total_seconds +=
                    record.total_seconds;
            });
        });

        createNode({
            ...summary,
            id: createNodeId(
                `${thisTypeBase}-${dayjs(summary.range.start).format(
                    SUMMARY_DATE_FORMAT
                )}`
            ),
            parent: null,
            children: [],
            internal: {
                type: thisTypeBase,
                contentDigest: createContentDigest(summary)
            }
        });
    });

    Object.entries(compoundSummaries).forEach(([objKey, typeEntries]) => {
        const key: keyof typeof compoundSummaries = objKey as keyof typeof compoundSummaries;
        const total_type_seconds = Object.values(typeEntries).reduce(
            (accumulator, currentValue) =>
                accumulator + currentValue.total_seconds,
            0
        );

        Object.entries(typeEntries).forEach(([objKey, typeEntry]) => {
            const subKey: keyof typeof typeEntries = objKey as keyof typeof typeEntries;

            const duration = dayjs.duration(typeEntry.total_seconds * 1000);

            const record: IWakaTimeSummaryRecord = {
                ...typeEntry,
                digital: duration.format("HH:mm:ss"),
                hours: duration.hours(),
                minutes: duration.minutes(),
                seconds: duration.seconds(),
                percent: (typeEntry.total_seconds / total_type_seconds) * 100,
                text: duration.humanize()
            };

            const thisType = `${thisTypeBase}_${String(key).toUpperCase()}`;

            createNode({
                ...record,
                id: createNodeId(
                    `${thisType}-${String(subKey)
                        .replace(new RegExp("[^a-z0-9]{1,}", "gi"), "")
                        .toUpperCase()}`
                ),
                parent: null,
                children: [],
                internal: {
                    type: thisType,
                    contentDigest: createContentDigest(record)
                }
            });
        });
    });
};

export { onPreInit, sourceNodes };
