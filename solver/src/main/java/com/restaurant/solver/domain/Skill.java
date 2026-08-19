package com.restaurant.solver.domain;

public class Skill {
    private String id;
    private String name;
    private String category;

    public Skill() {}
    public Skill(String id, String name, String category) {
        this.id = id; this.name = name; this.category = category;
    }

    public String getId()       { return id; }
    public String getName()     { return name; }
    public String getCategory() { return category; }
    public void setId(String id)           { this.id = id; }
    public void setName(String name)       { this.name = name; }
    public void setCategory(String cat)    { this.category = cat; }
}
