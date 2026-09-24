// Central registry for AI-generated cartoon background art (bundled assets).
export const IMAGES = {
  home: require("@/assets/images/game/home_bg.jpg"),
  splashHero: require("@/assets/images/game/splash_hero.jpg"),
  city: require("@/assets/images/game/bg_city.jpg"),
  desert: require("@/assets/images/game/bg_desert.jpg"),
  rain: require("@/assets/images/game/bg_rain.jpg"),
};

export type EnvKey = "city" | "desert" | "rain";
export const ENV_IMAGE: Record<EnvKey, any> = {
  city: IMAGES.city,
  desert: IMAGES.desert,
  rain: IMAGES.rain,
};
