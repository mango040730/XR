/** Shared by the swimming models, random catches and catch animation. Lengths are gameplay ranges. */
export const FISH_SPECIES=[
 {id:'pomfret',name:'병어',minLengthCm:20,maxLengthCm:32},
 {id:'mackerel',name:'고등어',minLengthCm:25,maxLengthCm:45},
 {id:'mullet',name:'숭어',minLengthCm:35,maxLengthCm:65},
] as const;
export type FishSpeciesId=typeof FISH_SPECIES[number]['id'];
export const CATCH_WAIT={minMs:30_000,maxMs:120_000} as const;
export const CATCH_WAIT_LABEL='30초~2분';
